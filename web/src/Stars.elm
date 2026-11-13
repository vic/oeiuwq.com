module Stars exposing (main)

{-| stars.oeiuwq.com: a Gopher client over every repo vic made or starred,
with a Veronica-2 search over their READMEs. ↑ ↓ move, Enter opens,
Backspace or ← goes back, / searches.
-}

import Browser
import Browser.Dom as Dom
import Common exposing (Flags, Repo)
import Dict
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick, onInput, onMouseEnter, onSubmit)
import Http
import Json.Decode as D
import Svg exposing (Svg)
import Svg.Attributes as SA
import Task
import Time
import Url


type Scope
    = All
    | Mine
    | Starred


scopeParam : Scope -> String
scopeParam s =
    case s of
        All ->
            "all"

        Mine ->
            "mine"

        Starred ->
            "stars"


type Page
    = Root
    | OwnList
    | StarList Int
    | Langs
    | Lang String
    | Results String Scope (Maybe (List Hit))
    | Readme Repo (Maybe String)


type alias Hit =
    { repo : Repo, mine : Bool, snippet : String }


type Kind
    = Dir
    | Txt
    | Info
    | Htm


type alias Item =
    { kind : Kind, label : String, go : Maybe Msg }


type alias Model =
    { flags : Flags
    , stack : List Page
    , sel : Int
    , query : String
    , scope : Scope
    , repos : List Repo
    , stars : List Repo
    , foot : Bool
    , sub : Maybe String
    , menu : Maybe String
    , tab : String
    , now : Maybe ( Time.Zone, Time.Posix )
    }


type Msg
    = Push Page
    | Back
    | Key String
    | Hover Int
    | SetQuery String
    | SetScope Scope
    | Submit
    | GotHits String Scope (Result Http.Error (List Hit))
    | GotReadme Repo (Result Http.Error String)
    | GotRepos (Result Http.Error (List Repo))
    | GotStars (Result Http.Error (List Repo))
    | Focused
    | Foot
    | Sub (Maybe String)
    | MenuBar (Maybe String)
    | Tab String
    | Tick (Maybe Time.Zone) Time.Posix
    | CloseAll
    | Noop


pageSize : Int
pageSize =
    100


main : Program D.Value Model Msg
main =
    Browser.element { init = init, update = update, view = view, subscriptions = \_ -> Sub.batch [ Common.onKey Key, Time.every 20000 (Tick Nothing) ] }


init : D.Value -> ( Model, Cmd Msg )
init v =
    ( { flags = D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }
      , stack = [ Root ]
      , sel = 0
      , query = ""
      , scope = All
      , repos = []
      , stars = []
      , foot = False
      , sub = Nothing
      , menu = Nothing
      , tab = "Places"
      , now = Nothing
      }
    , Cmd.batch
        [ Common.getJson "/api/repos" (D.list Common.repoDecoder) GotRepos
        , Task.map2 (\z p -> Tick (Just z) p) Time.here Time.now |> Task.perform identity
        , Common.getJson "/api/stars" (D.list Common.repoDecoder) GotStars
        ]
    )


current : Model -> Page
current m =
    List.head m.stack |> Maybe.withDefault Root


replaceTop : Page -> Model -> Model
replaceTop p m =
    { m | stack = p :: List.drop 1 m.stack }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        Push p ->
            ( { m | stack = p :: m.stack, sel = 0 }
            , case p of
                Readme r Nothing ->
                    Http.get { url = "/api/readme?repo=" ++ Url.percentEncode r.fullName, expect = Http.expectString (GotReadme r) }

                _ ->
                    Cmd.none
            )

        Back ->
            ( { m
                | stack =
                    if List.length m.stack > 1 then
                        List.drop 1 m.stack

                    else
                        m.stack
                , sel = 0
              }
            , Cmd.none
            )

        Hover i ->
            ( { m | sel = i }, Cmd.none )

        SetQuery q ->
            ( { m | query = q }, Cmd.none )

        SetScope s ->
            ( { m | scope = s }, Cmd.none )

        Submit ->
            if String.trim m.query == "" then
                ( m, Cmd.none )

            else
                ( { m | stack = Results m.query m.scope Nothing :: m.stack, sel = 0 }
                , Common.getJson ("/api/search?limit=100&scope=" ++ scopeParam m.scope ++ "&q=" ++ Url.percentEncode m.query)
                    (D.list (D.map3 Hit (D.field "repo" Common.repoDecoder) (D.field "mine" D.bool) (D.field "snippet" D.string)))
                    (GotHits m.query m.scope)
                )

        GotHits q s r ->
            case current m of
                Results q2 s2 Nothing ->
                    if q == q2 && s == s2 then
                        ( replaceTop (Results q s (Just (Result.withDefault [] r))) m, Cmd.none )

                    else
                        ( m, Cmd.none )

                _ ->
                    ( m, Cmd.none )

        GotReadme repo r ->
            case current m of
                Readme r2 Nothing ->
                    if r2.fullName == repo.fullName then
                        ( replaceTop (Readme repo (Just (Result.withDefault "(the README could not be read)" r))) m, Cmd.none )

                    else
                        ( m, Cmd.none )

                _ ->
                    ( m, Cmd.none )

        GotRepos r ->
            ( { m | repos = Result.withDefault [] r }, Cmd.none )

        GotStars r ->
            ( { m | stars = Result.withDefault [] r }, Cmd.none )

        Foot ->
            ( { m | foot = not m.foot, sub = Nothing, menu = Nothing }, Cmd.none )

        Sub s ->
            ( { m | sub = s }, Cmd.none )

        MenuBar s ->
            ( { m | menu = s, foot = False }, Cmd.none )

        Tab t ->
            ( { m | tab = t }, Cmd.none )

        Tick z p ->
            ( { m | now = Just ( Maybe.withDefault (Maybe.map Tuple.first m.now |> Maybe.withDefault Time.utc) z, p ) }, Cmd.none )

        Noop ->
            ( m, Cmd.none )

        CloseAll ->
            ( { m | foot = False, sub = Nothing, menu = Nothing }, Cmd.none )

        Focused ->
            ( m, Cmd.none )

        Key k ->
            let
                its =
                    selectable m

                n =
                    List.length its
            in
            case k of
                "ArrowDown" ->
                    ( { m | sel = Basics.min (n - 1) (m.sel + 1) }, Cmd.none )

                "ArrowUp" ->
                    ( { m | sel = Basics.max 0 (m.sel - 1) }, Cmd.none )

                "ArrowLeft" ->
                    update Back m

                "Backspace" ->
                    update Back m

                "Enter" ->
                    case List.drop m.sel its |> List.head |> Maybe.andThen .go of
                        Just next ->
                            update next m

                        Nothing ->
                            ( m, Cmd.none )

                "/" ->
                    ( { m | stack = [ Root ], sel = 0 }, Task.attempt (\_ -> Focused) (Dom.focus "veronica") )

                _ ->
                    ( m, Cmd.none )


{-| Items with an action, in screen order: what the arrow keys walk.
-}
selectable : Model -> List Item
selectable m =
    List.filter (\i -> i.go /= Nothing) (items m (current m))


repoItem : Repo -> Item
repoItem r =
    Item Txt (r.fullName ++ pad r.fullName ++ "★" ++ String.fromInt r.stars ++ "  " ++ String.left 60 r.description) (Just (Push (Readme r Nothing)))


pad : String -> String
pad s =
    String.repeat (Basics.max 1 (34 - String.length s)) " "


byLang : Model -> List ( String, Int )
byLang m =
    (m.repos ++ m.stars)
        |> List.foldl (\r d -> Dict.update (lang r) (\c -> Just (1 + Maybe.withDefault 0 c)) d) Dict.empty
        |> Dict.toList
        |> List.sortBy (Tuple.second >> negate)


lang : Repo -> String
lang r =
    if r.language == "" then
        "Other"

    else
        r.language


items : Model -> Page -> List Item
items m page =
    case page of
        Root ->
            [ Item Info "Welcome to the stars gopherhole of vic." Nothing
            , Item Info "Every repository I made or starred, with its README." Nothing
            , Item Info "" Nothing
            , Item Dir ("Mine/                              " ++ String.fromInt (List.length m.repos) ++ " repos") (Just (Push OwnList))
            , Item Dir ("Starred/                           " ++ String.fromInt (List.length m.stars) ++ " repos, newest first") (Just (Push (StarList 0)))
            , Item Dir "By language/" (Just (Push Langs))
            , Item Info "" Nothing
            , Item Htm "codes.oeiuwq.com: the same repos on a timeline" Nothing
            ]

        OwnList ->
            List.map repoItem (List.sortBy (.stars >> negate) m.repos)

        StarList p ->
            let
                sorted =
                    List.sortBy (.starredAt >> Maybe.withDefault "") m.stars |> List.reverse

                pageItems =
                    sorted |> List.drop (p * pageSize) |> List.take pageSize |> List.map repoItem

                more =
                    if (p + 1) * pageSize < List.length sorted then
                        [ Item Dir ("Page " ++ String.fromInt (p + 2) ++ "/") (Just (Push (StarList (p + 1)))) ]

                    else
                        []
            in
            Item Info ("Page " ++ String.fromInt (p + 1) ++ " of " ++ String.fromInt ((List.length sorted + pageSize - 1) // pageSize)) Nothing :: pageItems ++ more

        Langs ->
            List.map (\( l, c ) -> Item Dir (l ++ "/" ++ pad (l ++ "/") ++ String.fromInt c) (Just (Push (Lang l)))) (byLang m)

        Lang l ->
            (m.repos ++ m.stars)
                |> List.filter (\r -> lang r == l)
                |> List.sortBy (.stars >> negate)
                |> List.take 300
                |> List.map repoItem

        Results q _ hits ->
            case hits of
                Nothing ->
                    [ Item Info ("Searching for \"" ++ q ++ "\"…") Nothing ]

                Just [] ->
                    [ Item Info "No README holds every word." Nothing ]

                Just hs ->
                    Item Info (String.fromInt (List.length hs) ++ " hits for \"" ++ q ++ "\"") Nothing
                        :: List.concatMap
                            (\h ->
                                [ repoItem h.repo
                                , Item Info ("      " ++ String.left 140 h.snippet) Nothing
                                ]
                            )
                            hs

        Readme _ _ ->
            []


path : Page -> String
path page =
    case page of
        Root ->
            "1/"

        OwnList ->
            "1/mine/"

        StarList p ->
            "1/starred/" ++ String.fromInt (p + 1)

        Langs ->
            "1/lang/"

        Lang l ->
            "1/lang/" ++ l

        Results q _ _ ->
            "7/veronica?" ++ q

        Readme r _ ->
            "0/" ++ r.fullName ++ "/README"


kindLabel : Kind -> String
kindLabel k =
    case k of
        Dir ->
            "(DIR)"

        Txt ->
            "(TXT)"

        Info ->
            "     "

        Htm ->
            "(HTM)"


viewGopher : Model -> Html Msg
viewGopher m =
    let
        page =
            current m
    in
    div [ class "gopher" ]
        [ header [ class "url" ]
            [ button [ onClick Back, disabled (List.length m.stack < 2) ] [ text "◀" ]
            , span [] [ text ("gopher://stars.oeiuwq.com:70/" ++ path page) ]
            ]
        , Html.form [ class "veronica", onSubmit Submit ]
            [ label [ for "veronica" ] [ text "(?)   Veronica-2 search: " ]
            , input [ id "veronica", value m.query, onInput SetQuery, placeholder "algebraic effects", autocomplete False ] []
            , span [ class "scopes" ]
                (List.map
                    (\( s, t ) -> button [ type_ "button", classList [ ( "on", m.scope == s ) ], onClick (SetScope s) ] [ text t ])
                    [ ( All, "all" ), ( Mine, "mine" ), ( Starred, "starred" ) ]
                )
            ]
        , case page of
            Readme r txt ->
                div [ class "doc" ]
                    [ p [] [ a [ href r.url ] [ text ("(HTM) " ++ r.url) ] ]
                    , p [ class "meta" ] [ text (r.description ++ "  ·  ★" ++ String.fromInt r.stars ++ "  ·  " ++ lang r) ]
                    , Maybe.map (Common.readme r.fullName) txt |> Maybe.withDefault (text "Loading…")
                    ]

            _ ->
                viewMenu m (items m page)
        , footer [] [ text "↑ ↓ move · Enter open · ← back · / search · ", a [ href (Common.site m.flags "home") ] [ text "oeiuwq.com" ] ]
        ]


viewMenu : Model -> List Item -> Html Msg
viewMenu m its =
    let
        step ( it, ( idx, acc ) ) =
            case it.go of
                Just go ->
                    ( idx + 1
                    , li [ classList [ ( "sel", idx == m.sel ) ], onMouseEnter (Hover idx), onClick go ]
                        [ span [ class "kind" ] [ text (kindLabel it.kind) ], text (" " ++ it.label) ]
                        :: acc
                    )

                Nothing ->
                    ( idx
                    , li [ class "info" ]
                        [ span [ class "kind" ] [ text (kindLabel it.kind) ]
                        , if it.kind == Htm then
                            a [ href (Common.site m.flags "codes") ] [ text (" " ++ it.label) ]

                          else
                            text (" " ++ it.label)
                        ]
                        :: acc
                    )
    in
    ul [ class "menu" ] (List.foldl (\it ( i, acc ) -> step ( it, ( i, acc ) )) ( 0, [] ) its |> Tuple.second |> List.reverse)



-- GNOME 1.4


{-| A desktop icon in the GNOME 1 style, drawn on a 48 by 48 grid.
-}
icon : String -> Svg msg
icon kind =
    let
        r x y w h fill =
            Svg.rect [ SA.x (String.fromInt x), SA.y (String.fromInt y), SA.width (String.fromInt w), SA.height (String.fromInt h), SA.fill fill, SA.stroke "var(--base00)", SA.strokeWidth "1.5" ] []

        poly pts fill =
            Svg.polygon [ SA.points pts, SA.fill fill, SA.stroke "var(--base00)", SA.strokeWidth "1.5", SA.strokeLinejoin "round" ] []

        glyph g col =
            Svg.text_ [ SA.x "24", SA.y "33", SA.textAnchor "middle", SA.fontSize "16", SA.fontWeight "700", SA.fill col, SA.fontFamily "sans-serif" ] [ Svg.text g ]

        body =
            case kind of
                "folder" ->
                    [ poly "4,12 18,12 22,16 44,16 44,40 4,40" "var(--base09)", r 4 20 40 20 "var(--base0A)" ]

                "home" ->
                    [ poly "24,6 44,24 39,24 39,42 9,42 9,24 4,24" "var(--base06)", r 20 30 8 12 "var(--base08)", r 12 27 6 6 "var(--base0C)", r 30 27 6 6 "var(--base0C)", poly "24,6 44,24 4,24" "var(--base0F)" ]

                "trash" ->
                    [ r 12 14 24 28 "var(--base04)", r 9 10 30 5 "var(--base03)", r 20 6 8 4 "var(--base03)", Svg.path [ SA.d "M18 18v20M24 18v20M30 18v20", SA.stroke "var(--base00)", SA.strokeWidth "1.5" ] [] ]

                "globe" ->
                    [ Svg.circle [ SA.cx "24", SA.cy "24", SA.r "18", SA.fill "var(--base0D)", SA.stroke "var(--base00)", SA.strokeWidth "1.5" ] []
                    , Svg.path [ SA.d "M6 24h36M24 6v36M11 13c8 5 18 5 26 0M11 35c8-5 18-5 26 0M24 6c-9 9-9 27 0 36M24 6c9 9 9 27 0 36", SA.fill "none", SA.stroke "var(--base00)", SA.strokeWidth "1.2" ] []
                    ]

                "term" ->
                    [ r 4 6 40 30 "var(--base03)", r 8 10 32 22 "var(--base00)", r 16 36 16 6 "var(--base04)", Svg.text_ [ SA.x "11", SA.y "25", SA.fontSize "11", SA.fill "var(--base0B)", SA.fontFamily "monospace" ] [ Svg.text ">_" ] ]

                _ ->
                    [ poly "10,4 32,4 40,12 40,44 10,44" "var(--base06)", poly "32,4 32,12 40,12" "var(--base04)", glyph kind "var(--base01)" ]
    in
    Svg.svg [ SA.viewBox "0 0 48 48", SA.class "g-svg" ] body


clock : Model -> String
clock m =
    case m.now of
        Just ( zone, t ) ->
            String.padLeft 2 '0' (String.fromInt (Time.toHour zone t)) ++ ":" ++ String.padLeft 2 '0' (String.fromInt (Time.toMinute zone t))

        Nothing ->
            "--:--"


stop : msg -> Attribute msg
stop msg =
    Html.Events.stopPropagationOn "click" (D.succeed ( msg, True ))


{-| The GNOME 1.4 main menu: the sites, sorted into submenus like programs.
-}
footMenu : Model -> Html Msg
footMenu m =
    let
        go =
            Common.site m.flags

        entry p =
            li [] [ a [ href (go p.name) ] [ span [ class "g-mi" ] [ icon p.glyph ], text p.title ] ]

        group name names =
            li [ classList [ ( "g-has", True ), ( "on", m.sub == Just name ) ], Html.Events.onMouseEnter (Sub (Just name)) ]
                [ span [ class "g-mi" ] [ icon "folder" ]
                , text name
                , span [ class "g-arrow" ] [ text "▸" ]
                , if m.sub == Just name then
                    ul [ class "g-menu g-submenu" ] (List.map entry (List.filter (\p -> List.member p.name names) Common.places))

                  else
                    text ""
                ]
    in
    ul [ class "g-menu g-main", stop Noop ]
        [ group "Internet" [ "codes", "stars", "blog" ]
        , group "Development" [ "projects", "smalltalk" ]
        , group "Games" [ "nes", "adventure", "sponsor" ]
        , group "Office" [ "portfolio" ]
        , group "Faith and Love" [ "faith", "love" ]
        , li [ class "g-sep" ] []
        , li [ Html.Events.onMouseEnter (Sub Nothing) ] [ a [ href Common.fundUrl ] [ span [ class "g-mi" ] [ icon "♥" ], text "Sponsor vic..." ] ]
        , li [] [ a [ href (go "blog" ++ "#2026-11-12-01-welcome") ] [ span [ class "g-mi" ] [ icon "?" ], text "About this site" ] ]
        , li [ class "g-sep" ] []
        , li [] [ a [ href (go "home") ] [ span [ class "g-mi" ] [ icon "⏻" ], text "Log Out" ] ]
        ]


menuBar : Model -> Html Msg
menuBar m =
    let
        go =
            Common.site m.flags

        menu name entries =
            div [ class "g-mb" ]
                [ button
                    [ classList [ ( "on", m.menu == Just name ) ]
                    , stop
                        (MenuBar
                            (if m.menu == Just name then
                                Nothing

                             else
                                Just name
                            )
                        )
                    ]
                    [ span [ class "g-ul" ] [ text (String.left 1 name) ], text (String.dropLeft 1 name) ]
                , if m.menu == Just name then
                    ul [ class "g-menu g-drop" ] entries

                  else
                    text ""
                ]

        act label msg =
            li [] [ button [ stop msg ] [ text label ] ]

        link label url =
            li [] [ a [ href url ] [ text label ] ]
    in
    nav [ class "g-menubar" ]
        [ menu "File" [ link "New Window" (go "stars"), link "Close Window" (go "home") ]
        , menu "Edit" [ act "Find in READMEs..." (Key "/") ]
        , menu "View" [ li [ class "g-check" ] [ text "✔ View as Gopher" ], act "Refresh" (Push (current m)) ]
        , menu "Go" [ act "Back" Back, act "Home" (Push Root), act "Mine" (Push OwnList), act "Starred" (Push (StarList 0)), act "Languages" (Push Langs) ]
        , menu "Bookmarks" (List.map (\p -> link (p.title ++ "  ·  " ++ p.blurb) (go p.name)) (Common.placesBut "stars"))
        , menu "Help" [ link "About this site" (go "blog" ++ "#2026-11-12-01-welcome"), link "Sponsor vic" Common.fundUrl ]
        ]


sidebar : Model -> Html Msg
sidebar m =
    let
        go =
            Common.site m.flags

        page =
            current m
    in
    aside [ class "g-side" ]
        [ div [ class "g-side-top" ]
            [ div [ class "g-side-icon" ] [ icon "folder" ]
            , h3 [] [ text (pageTitle page) ]
            , p [] [ text (String.fromInt (List.length m.repos) ++ " own, " ++ String.fromInt (List.length m.stars) ++ " starred") ]
            ]
        , div [ class "g-side-body" ]
            (case m.tab of
                "History" ->
                    [ ul [ class "g-hist" ] (List.map (\pg -> li [] [ button [ onClick (Push pg) ] [ text (pageTitle pg) ] ]) m.stack) ]

                "Notes" ->
                    [ p [] [ text "This is a Gopher client in Nautilus, on GNOME 1.4. Veronica-2 searches the README of every repo vic made or starred." ]
                    , p [] [ text "Press / to search, arrows to move, Enter to open." ]
                    ]

                _ ->
                    [ ul [ class "g-tree" ] (List.map (\p -> li [] [ a [ href (go p.name), title p.blurb ] [ span [ class "g-mi" ] [ icon p.glyph ], text p.title ] ]) (Common.placesBut "stars")) ]
            )
        , div [ class "g-tabs" ] (List.map (\t -> button [ classList [ ( "on", m.tab == t ) ], onClick (Tab t) ] [ text t ]) [ "Places", "History", "Notes" ])
        ]


pageTitle : Page -> String
pageTitle page =
    case page of
        Root ->
            "stars"

        OwnList ->
            "Mine"

        StarList n ->
            "Starred, page " ++ String.fromInt (n + 1)

        Langs ->
            "Languages"

        Lang l ->
            l

        Results q _ _ ->
            "Search: " ++ q

        Readme r _ ->
            r.fullName


view : Model -> Html Msg
view m =
    let
        go =
            Common.site m.flags

        desk ic label url =
            a [ class "g-icon", href url ] [ icon ic, span [ class "g-label" ] [ text label ] ]

        tool ic label msg =
            button [ class "g-tool", onClick msg ] [ span [ class "g-ti" ] [ text ic ], text label ]
    in
    div [ class "gnome", onClick CloseAll ]
        [ div [ class "g-desktop" ]
            (desk "globe" "Start Here" (go "home")
                :: desk "home" "vic's Home" (go "portfolio")
                :: List.map (\p -> desk p.glyph p.title (go p.name)) (List.filter (\p -> List.member p.name [ "codes", "projects", "nes", "adventure", "smalltalk" ]) Common.places)
                ++ [ desk "trash" "Trash" (go "love") ]
            )
        , section [ class "g-win" ]
            [ header [ class "g-title" ]
                [ span [ class "g-wbtn" ] [ text "▾" ]
                , h2 [] [ text (pageTitle (current m) ++ " - Nautilus") ]
                , span [ class "g-wbtn" ] [ text "_" ]
                , span [ class "g-wbtn" ] [ text "□" ]
                , a [ class "g-wbtn", href (go "home"), title "Close" ] [ text "×" ]
                ]
            , menuBar m
            , div [ class "g-toolbar" ]
                [ tool "◀" "Back" Back
                , tool "▶" "Forward" Noop
                , tool "▲" "Up" (Push Root)
                , tool "↻" "Refresh" (Push (current m))
                , tool "⌂" "Home" (Push Root)
                , tool "⌕" "Search" (Key "/")
                , span [ class "g-throbber" ] [ icon "globe" ]
                ]
            , div [ class "g-locbar" ]
                [ label [] [ text "Location:" ]
                , span [ class "g-entry" ] [ text ("gopher://stars.oeiuwq.com:70/" ++ path (current m)) ]
                , label [] [ text "View as:" ]
                , span [ class "g-option" ] [ text "Gopher View ▾" ]
                ]
            , div [ class "g-panes" ]
                [ sidebar m
                , div [ class "g-content" ] [ viewGopher m ]
                ]
            , div [ class "g-status" ] [ text (String.fromInt (List.length (items m (current m))) ++ " items · Veronica-2 searches every README"), span [ class "g-grip" ] [] ]
            ]
        , if m.foot then
            footMenu m

          else
            text ""
        , nav [ class "g-panel" ]
            [ span [ class "g-hide" ] [ text "◂" ]
            , button [ classList [ ( "g-foot", True ), ( "on", m.foot ) ], stop Foot, attribute "aria-label" "Main Menu" ] [ footprint ]
            , div [ class "g-launch" ] (List.map (\p -> a [ href (go p.name), title (p.title ++ ": " ++ p.blurb) ] [ icon p.glyph ]) (Common.placesBut "stars"))
            , div [ class "g-tasks" ] [ span [ class "on" ] [ icon "folder", text (pageTitle (current m) ++ " - Nautilus") ] ]
            , div [ class "g-pager" ] [ span [ class "on" ] [], span [] [], span [] [], span [] [] ]
            , span [ class "g-clock" ] [ text (clock m) ]
            , span [ class "g-hide" ] [ text "▸" ]
            ]
        ]


{-| A footprint for the main menu button, drawn here.
-}
footprint : Html msg
footprint =
    Svg.svg [ SA.viewBox "0 0 32 32", SA.class "g-footsvg" ]
        [ Svg.ellipse [ SA.cx "17", SA.cy "21", SA.rx "6", SA.ry "8", SA.fill "currentColor" ] []
        , Svg.circle [ SA.cx "9", SA.cy "8", SA.r "2.6", SA.fill "currentColor" ] []
        , Svg.circle [ SA.cx "14", SA.cy "5", SA.r "2.8", SA.fill "currentColor" ] []
        , Svg.circle [ SA.cx "20", SA.cy "5", SA.r "2.6", SA.fill "currentColor" ] []
        , Svg.circle [ SA.cx "25", SA.cy "8", SA.r "2.3", SA.fill "currentColor" ] []
        ]
