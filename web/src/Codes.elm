module Codes exposing (main)

{-| codes.oeiuwq.com: a Mac OS 9 Platinum desktop over every public repo of vic.
Windows: Timeline, Repositories, Get Info, Logic (Datalog and μKanren over
the repos, stars and GH Archive facts),
Activity (contributions per year), Appearance and About.
-}

import Browser
import Browser.Events
import Common exposing (Flags, Repo, Scheme, Year)
import Dict exposing (Dict)
import Facts
import Horn exposing (Val(..))
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (on, onCheck, onClick, onInput, stopPropagationOn)
import Http
import Json.Decode as D
import Logic exposing (Engine(..), presetProgram, presets, similarTo)
import Process
import Svg
import Svg.Attributes as SA
import Svg.Events as SE
import Task


type Win
    = Timeline
    | Repos
    | Info
    | Logic
    | Activity
    | Appearance
    | About


allWins : List Win
allWins =
    [ Timeline, Repos, Info, Logic, Activity, Appearance, About ]


winTitle : Win -> String
winTitle w =
    case w of
        Timeline ->
            "Timeline"

        Repos ->
            "Repositories"

        Info ->
            "Get Info"

        Logic ->
            "Logic · Datalog + μKanren"

        Activity ->
            "Activity"

        Appearance ->
            "Appearance"

        About ->
            "About This Site"


winClass : Win -> String
winClass w =
    "w-" ++ String.toLower (String.left 5 (String.filter Char.isAlpha (winTitle w)))


type alias Window =
    { win : Win, x : Int, y : Int, z : Int }


type SortBy
    = ByPushed
    | ByName
    | ByStars
    | ByLang


{-| The logic window: idle, waiting for GH Archive facts, solving, or done.
-}
type Run
    = Idle
    | Loading (List String)
    | Solving
    | Answers (List String) (List (List Val)) String
    | Failed String


type alias Model =
    { flags : Flags
    , repos : List Repo
    , stars : List Repo
    , years : List Year
    , windows : List Window
    , top : Int
    , drag : Maybe { win : Win, dx : Int, dy : Int }
    , menu : Maybe String
    , selected : Maybe Repo
    , filter : String
    , sortBy : SortBy
    , forks : Bool
    , showStars : Bool
    , program : String
    , engine : Engine
    , run : Run
    , archive : Dict String (List (List Val))
    , year : Int
    , schemes : List Scheme
    , schemeQuery : String
    , preview : Maybe Scheme
    , saved : String
    }


type Msg
    = GotRepos (Result Http.Error (List Repo))
    | GotStars (Result Http.Error (List Repo))
    | GotYears (Result Http.Error (List Year))
    | GotSchemes (Result Http.Error (List Scheme))
    | Open Win
    | Close Win
    | Raise Win
    | StartDrag Win Int Int
    | Drag Int Int
    | Drop
    | ToggleMenu String
    | CloseMenu
    | SelectRepo Repo
    | SelectName String
    | Filter String
    | SortOn SortBy
    | Forks Bool
    | ShowStars Bool
    | SetProgram String
    | SetEngine Engine
    | Solve
    | RunPreset Engine String
    | GotArchive String (Result Http.Error (List (List Val)))
    | Solved
    | SetYear Int
    | SchemeQuery String
    | Preview Scheme
    | SaveScheme
    | Saved String (Result Http.Error ())


main : Program D.Value Model Msg
main =
    Browser.element { init = init, update = update, view = view, subscriptions = subscriptions }


init : D.Value -> ( Model, Cmd Msg )
init v =
    let
        flags =
            D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }
    in
    ( { flags = flags
      , repos = []
      , stars = []
      , years = []
      , windows = Window Timeline 24 44 1 :: List.map (\w -> Window w 80 70 2) (fromHash flags.hash)
      , top = 2
      , drag = Nothing
      , menu = Nothing
      , selected = Nothing
      , filter = ""
      , sortBy = ByPushed
      , forks = False
      , showStars = True
      , program = presetProgram 0
      , engine = Bottom
      , archive = Dict.empty
      , run = Idle
      , year = 0
      , schemes = []
      , schemeQuery = ""
      , preview = Nothing
      , saved = flags.scheme
      }
    , Cmd.batch
        [ Common.getJson "/api/repos" (D.list Common.repoDecoder) GotRepos
        , Common.getJson "/api/stars" (D.list Common.repoDecoder) GotStars
        , Common.getJson "/api/contrib" (D.list Common.yearDecoder) GotYears
        ]
    )


subscriptions : Model -> Sub Msg
subscriptions m =
    case m.drag of
        Just _ ->
            Sub.batch
                [ Browser.Events.onMouseMove (D.map2 Drag (D.field "clientX" D.int) (D.field "clientY" D.int))
                , Browser.Events.onMouseUp (D.succeed Drop)
                ]

        Nothing ->
            Sub.none



-- UPDATE


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        GotRepos r ->
            ( { m | repos = Result.withDefault [] r }, Cmd.none )

        GotStars r ->
            ( { m | stars = Result.withDefault [] r }, Cmd.none )

        GotYears r ->
            let
                ys =
                    Result.withDefault [] r
            in
            ( { m | years = ys, year = List.map .year ys |> List.maximum |> Maybe.withDefault 0 }, Cmd.none )

        GotSchemes r ->
            ( { m | schemes = Result.withDefault [] r }, Cmd.none )

        Open w ->
            ( open w { m | menu = Nothing }
            , if w == Appearance && List.isEmpty m.schemes then
                Common.getJson "/api/themes" (D.list Common.schemeDecoder) GotSchemes

              else
                Cmd.none
            )

        Close w ->
            ( { m | windows = List.filter (\x -> x.win /= w) m.windows }, Cmd.none )

        Raise w ->
            ( raise w m, Cmd.none )

        StartDrag w cx cy ->
            case List.filter (\x -> x.win == w) m.windows |> List.head of
                Just x ->
                    ( raise w { m | drag = Just { win = w, dx = cx - x.x, dy = cy - x.y } }, Cmd.none )

                Nothing ->
                    ( m, Cmd.none )

        Drag cx cy ->
            case m.drag of
                Just d ->
                    ( { m
                        | windows =
                            List.map
                                (\x ->
                                    if x.win == d.win then
                                        { x | x = Basics.max 0 (cx - d.dx), y = Basics.max 22 (cy - d.dy) }

                                    else
                                        x
                                )
                                m.windows
                      }
                    , Cmd.none
                    )

                Nothing ->
                    ( m, Cmd.none )

        Drop ->
            ( { m | drag = Nothing }, Cmd.none )

        ToggleMenu name ->
            ( { m
                | menu =
                    if m.menu == Just name then
                        Nothing

                    else
                        Just name
              }
            , Cmd.none
            )

        CloseMenu ->
            ( { m | menu = Nothing }, Cmd.none )

        SelectRepo r ->
            ( open Info { m | selected = Just r }, Cmd.none )

        SelectName name ->
            case List.filter (\r -> r.fullName == name) (m.repos ++ m.stars) |> List.head of
                Just r ->
                    ( open Info { m | selected = Just r }, Cmd.none )

                Nothing ->
                    ( m, Cmd.none )

        Filter s ->
            ( { m | filter = s }, Cmd.none )

        SortOn s ->
            ( { m | sortBy = s }, Cmd.none )

        Forks b ->
            ( { m | forks = b }, Cmd.none )

        ShowStars b ->
            ( { m | showStars = b }, Cmd.none )

        SetProgram s ->
            ( { m | program = s }, Cmd.none )

        SetEngine e ->
            ( { m | engine = e }, Cmd.none )

        Solve ->
            startSolve (open Logic m)

        RunPreset e src ->
            startSolve (open Logic { m | engine = e, program = src, menu = Nothing })

        GotArchive pred r ->
            case r of
                Ok rows ->
                    continueSolve { m | archive = Dict.insert pred rows m.archive }

                Err e ->
                    ( { m | run = Failed ("GH Archive facts " ++ pred ++ " could not be loaded: " ++ httpError e) }, Cmd.none )

        Solved ->
            ( { m | run = solveNow m }, Cmd.none )

        SetYear y ->
            ( { m | year = y }, Cmd.none )

        SchemeQuery q ->
            ( { m | schemeQuery = q }, Cmd.none )

        Preview s ->
            ( { m | preview = Just s }, Cmd.none )

        SaveScheme ->
            case m.preview of
                Just s ->
                    ( m, Common.saveScheme (Saved s.id) s.id )

                Nothing ->
                    ( m, Cmd.none )

        Saved id r ->
            ( { m
                | saved =
                    if r == Ok () then
                        id

                    else
                        m.saved
              }
            , Cmd.none
            )


open : Win -> Model -> Model
open w m =
    if List.any (\x -> x.win == w) m.windows then
        raise w m

    else
        let
            n =
                List.length m.windows
        in
        { m | top = m.top + 1, windows = m.windows ++ [ Window w (60 + 28 * n) (60 + 24 * n) (m.top + 1) ] }


raise : Win -> Model -> Model
raise w m =
    { m
        | top = m.top + 1
        , windows =
            List.map
                (\x ->
                    if x.win == w then
                        { x | z = m.top + 1 }

                    else
                        x
                )
                m.windows
    }



-- LOGIC: DATALOG AND μKANREN OVER THE FACTS


httpError : Http.Error -> String
httpError e =
    case e of
        Http.BadStatus code ->
            "status " ++ String.fromInt code

        Http.Timeout ->
            "timeout"

        Http.NetworkError ->
            "network error"

        Http.BadBody b ->
            String.left 200 b

        Http.BadUrl u ->
            u


{-| The `gh_*` predicates a program names that are not loaded yet.
-}
missing : Model -> Horn.Program -> List String
missing m =
    Logic.needs (\name -> Dict.member name m.archive)


startSolve : Model -> ( Model, Cmd Msg )
startSolve m =
    case Horn.parse m.program of
        Err e ->
            ( { m | run = Failed ("syntax: " ++ e) }, Cmd.none )

        Ok p ->
            case missing m p of
                [] ->
                    continueSolve m

                need ->
                    ( { m | run = Loading need }
                    , Cmd.batch
                        (List.filterMap
                            (\pred ->
                                List.filter (\( n, _ ) -> n == pred) Facts.archiveSources
                                    |> List.head
                                    |> Maybe.map
                                        (\( _, src ) ->
                                            Common.getJson ("/api/archive/" ++ src) (D.field "rows" (D.list (D.list cell))) (GotArchive pred)
                                        )
                            )
                            need
                        )
                    )


{-| Solves once every needed fact source is in; a short sleep lets the
window show "Solving" first, as the solver holds the page while it runs.
-}
continueSolve : Model -> ( Model, Cmd Msg )
continueSolve m =
    case Horn.parse m.program |> Result.map (missing m) of
        Ok [] ->
            ( { m | run = Solving }, Task.perform (\_ -> Solved) (Process.sleep 30) )

        Ok need ->
            ( { m | run = Loading need }, Cmd.none )

        Err e ->
            ( { m | run = Failed ("syntax: " ++ e) }, Cmd.none )


solveNow : Model -> Run
solveNow m =
    case Horn.parse m.program |> Result.andThen (Logic.solve m.engine (Dict.foldl Facts.withArchive (Facts.local m.repos m.stars m.years) m.archive)) of
        Ok o ->
            Answers o.vars o.rows o.stats

        Err e ->
            Failed e


cell : D.Decoder Val
cell =
    D.oneOf [ D.map S D.string, D.map N D.int ]



-- VIEW


view : Model -> Html Msg
view m =
    div [ class "mac", onClick CloseMenu ]
        [ case m.preview of
            Just s ->
                node "style" [] [ text (Common.schemeCss s) ]

            Nothing ->
                text ""
        , menuBar m
        , desktop m
        , div [] (List.map (viewWindow m) (List.sortBy .z m.windows))
        ]


stop : msg -> Attribute msg
stop msg =
    stopPropagationOn "click" (D.succeed ( msg, True ))


menuBar : Model -> Html Msg
menuBar m =
    let
        menu name items =
            div [ classList [ ( "menu", True ), ( "open", m.menu == Just name ) ] ]
                [ button [ class "title", stop (ToggleMenu name) ] [ text name ]
                , if m.menu == Just name then
                    div [ class "drop" ] items

                  else
                    text ""
                ]

        item label msg =
            button [ class "item", stop msg ] [ text label ]

        link label url =
            a [ class "item", href url ] [ text label ]
    in
    nav [ class "menubar" ]
        [ menu "◆"
            [ item "About This Site" (Open About)
            , link "Sponsor vic…" Common.fundUrl
            , hr [] []
            , link "Home (oeiuwq.com)" (Common.site m.flags "home")
            ]
        , menu "File" (List.map (\w -> item ("Open " ++ winTitle w) (Open w)) [ Timeline, Repos, Logic, Activity ])
        , menu "Logic" (List.map (\( t, e, p ) -> item t (RunPreset e p)) presets)
        , menu "Control Panels" [ item "Appearance" (Open Appearance) ]
        , menu "Go"
            (List.map (\p -> link (p.glyph ++ "  " ++ p.title ++ "  —  " ++ p.blurb) (Common.site m.flags p.name)) (Common.placesBut "codes"))
        , span [ class "right" ] [ text "codes.oeiuwq.com" ]
        ]


desktop : Model -> Html Msg
desktop m =
    let
        icon glyph label msg =
            button [ class "icon", onClick msg ] [ span [ class "glyph" ] [ text glyph ], span [ class "label" ] [ text label ] ]

        linkIcon glyph label url =
            a [ class "icon", href url ] [ span [ class "glyph" ] [ text glyph ], span [ class "label" ] [ text label ] ]
    in
    div [ class "desktop" ]
        ([ icon "▤" "Timeline" (Open Timeline)
         , icon "▦" "Repositories" (Open Repos)
         , icon "⊢" "Logic" (Open Logic)
         , icon "▩" "Activity" (Open Activity)
         , icon "◐" "Appearance" (Open Appearance)
         ]
            ++ List.map (\p -> a [ class "icon alias", href (Common.site m.flags p.name), title p.blurb ] [ span [ class "glyph" ] [ text p.glyph ], span [ class "label" ] [ text p.title ] ]) (Common.placesBut "codes")
        )


viewWindow : Model -> Window -> Html Msg
viewWindow m w =
    section
        [ class ("window " ++ winClass w.win)
        , style "left" (String.fromInt w.x ++ "px")
        , style "top" (String.fromInt w.y ++ "px")
        , style "z-index" (String.fromInt w.z)
        , on "mousedown" (D.succeed (Raise w.win))
        ]
        [ header
            [ class "titlebar"
            , on "mousedown" (D.map2 (StartDrag w.win) (D.field "clientX" D.int) (D.field "clientY" D.int))
            ]
            [ button [ class "close", onClick (Close w.win), attribute "aria-label" "Close" ] []
            , h2 [] [ text (winTitle w.win) ]
            ]
        , div [ class "body" ]
            [ case w.win of
                Timeline ->
                    viewTimeline m

                Repos ->
                    viewRepos m

                Info ->
                    viewInfo m

                Logic ->
                    viewLogic m

                Activity ->
                    viewActivity m

                Appearance ->
                    viewAppearance m

                About ->
                    viewAbout m
            ]
        ]


own : Model -> List Repo
own m =
    List.filter (\r -> m.forks || not r.fork) m.repos


lang : Repo -> String
lang r =
    if r.language == "" then
        "Other"

    else
        r.language



-- TIMELINE


{-| A date as a fractional year: 2014-07-01 is about 2014.5.
-}
yearFrac : String -> Float
yearFrac iso =
    let
        n a b =
            String.slice a b iso |> String.toFloat |> Maybe.withDefault 1
    in
    n 0 4 + (n 5 7 - 1) / 12 + (n 8 10 - 1) / 365


viewTimeline : Model -> Html Msg
viewTimeline m =
    let
        repos =
            own m

        y0 =
            2008

        y1 =
            (List.map (.pushedAt >> Common.yearOf) repos ++ List.map .year m.years) |> List.maximum |> Maybe.withDefault 2026

        labelW =
            120

        width =
            1100

        xOf t =
            labelW + (t - toFloat y0) / toFloat (y1 + 1 - y0) * toFloat (width - labelW - 10)

        groups =
            repos
                |> List.foldl (\r d -> Dict.update (lang r) (\l -> Just (r :: Maybe.withDefault [] l)) d) Dict.empty
                |> Dict.toList
                |> List.sortBy
                    (\( l, rs ) ->
                        ( if l == "Other" then
                            1

                          else
                            0
                        , negate (List.length rs)
                        )
                    )

        barsTop =
            16

        perYear f items =
            List.range y0 y1 |> List.map (\y -> ( y, List.filter (\i -> f i == y) items |> List.length ))

        contrib =
            List.map (\y -> ( y.year, y.total )) m.years

        starsPerYear =
            perYear (\r -> Common.yearOf (Maybe.withDefault "" r.starredAt)) m.stars

        bars label top h color data =
            let
                peak =
                    List.map Tuple.second data |> List.maximum |> Maybe.withDefault 1 |> Basics.max 1
            in
            Svg.g []
                (Svg.text_ [ SA.x "4", SA.y (String.fromInt (top + h - 4)), SA.class "lane" ] [ Svg.text label ]
                    :: List.map
                        (\( y, v ) ->
                            let
                                bh =
                                    toFloat h * toFloat v / toFloat peak
                            in
                            Svg.rect
                                [ SA.x (String.fromFloat (xOf (toFloat y) + 2))
                                , SA.y (String.fromFloat (toFloat (top + h) - bh))
                                , SA.width (String.fromFloat (xOf (toFloat (y + 1)) - xOf (toFloat y) - 4))
                                , SA.height (String.fromFloat bh)
                                , SA.fill color
                                ]
                                [ Svg.title [] [ Svg.text (label ++ " " ++ String.fromInt y ++ ": " ++ String.fromInt v) ] ]
                        )
                        data
                )

        head =
            if m.showStars then
                [ bars "contributions" barsTop 50 "var(--base0B)" contrib, bars "stars given" (barsTop + 56) 40 "var(--base0A)" starsPerYear ]

            else
                [ bars "contributions" barsTop 50 "var(--base0B)" contrib ]

        headH =
            if m.showStars then
                126

            else
                80

        rowH =
            5

        lanes =
            List.foldl
                (\( l, rs ) ( acc, top, i ) ->
                    let
                        color =
                            "var(--base0" ++ String.slice (8 + modBy 8 i) (9 + modBy 8 i) "0123456789ABCDEF" ++ ")"

                        sorted =
                            List.sortBy .createdAt rs

                        h =
                            List.length rs * rowH + 18
                    in
                    ( Svg.g []
                        (Svg.line [ SA.x1 "0", SA.x2 (String.fromInt width), SA.y1 (String.fromInt top), SA.y2 (String.fromInt top), SA.class "sep" ] []
                            :: Svg.text_ [ SA.x "4", SA.y (String.fromInt (top + 13)), SA.class "lane", SA.fill color ] [ Svg.text (l ++ " · " ++ String.fromInt (List.length rs)) ]
                            :: List.indexedMap
                                (\j r ->
                                    let
                                        a =
                                            xOf (yearFrac r.createdAt)

                                        b =
                                            Basics.max (a + 3) (xOf (yearFrac r.pushedAt))
                                    in
                                    Svg.rect
                                        [ SA.x (String.fromFloat a)
                                        , SA.y (String.fromInt (top + 16 + j * rowH))
                                        , SA.width (String.fromFloat (b - a))
                                        , SA.height (String.fromInt (rowH - 1))
                                        , SA.fill color
                                        , SA.opacity (String.fromFloat (0.45 + 0.55 * Basics.min 1 (logBase 10 (toFloat r.stars + 1) / 2.5)))
                                        , SA.class "bar"
                                        , SE.onClick (SelectRepo r)
                                        ]
                                        [ Svg.title [] [ Svg.text (r.fullName ++ " · ★" ++ String.fromInt r.stars ++ " · " ++ String.left 10 r.createdAt ++ " → " ++ String.left 10 r.pushedAt ++ "\n" ++ r.description) ] ]
                                )
                                sorted
                        )
                        :: acc
                    , top + h
                    , i + 1
                    )
                )
                ( [], headH, 0 )
                groups

        ( laneSvgs, totalH, _ ) =
            lanes

        grid =
            List.range y0 (y1 + 1)
                |> List.concatMap
                    (\y ->
                        [ Svg.line [ SA.x1 (String.fromFloat (xOf (toFloat y))), SA.x2 (String.fromFloat (xOf (toFloat y))), SA.y1 "0", SA.y2 (String.fromInt totalH), SA.class "grid" ] []
                        , if y <= y1 then
                            Svg.g [] [ Svg.text_ [ SA.x (String.fromFloat (xOf (toFloat y) + 4)), SA.y "11", SA.class "year" ] [ Svg.text (String.fromInt y) ], Svg.text_ [ SA.x (String.fromFloat (xOf (toFloat y) + 4)), SA.y (String.fromInt (totalH + 14)), SA.class "year" ] [ Svg.text ("'" ++ String.right 2 (String.fromInt y)) ] ]

                          else
                            Svg.text ""
                        ]
                    )
    in
    div []
        [ div [ class "toolbar" ]
            [ label [] [ input [ type_ "checkbox", checked m.forks, onCheck Forks ] [], text " forks" ]
            , label [] [ input [ type_ "checkbox", checked m.showStars, onCheck ShowStars ] [], text " stars given per year" ]
            , span [ class "note" ] [ text (String.fromInt (List.length repos) ++ " repos by language. A bar runs from creation to last push. Click one.") ]
            ]
        , if List.isEmpty repos then
            p [ class "loading" ] [ text "Loading…" ]

          else
            Svg.svg [ SA.viewBox ("0 0 " ++ String.fromInt width ++ " " ++ String.fromInt (totalH + 20)), SA.class "timeline" ]
                (grid ++ head ++ laneSvgs)
        ]



-- REPOSITORIES


viewRepos : Model -> Html Msg
viewRepos m =
    let
        f =
            String.toLower m.filter

        rows =
            own m
                |> List.filter (\r -> String.contains f (String.toLower (r.fullName ++ " " ++ r.description ++ " " ++ r.language ++ " " ++ String.join " " r.topics)))
                |> (case m.sortBy of
                        ByPushed ->
                            List.sortBy .pushedAt >> List.reverse

                        ByName ->
                            List.sortBy (.name >> String.toLower)

                        ByStars ->
                            List.sortBy (.stars >> negate)

                        ByLang ->
                            List.sortBy lang
                   )

        th_ label s =
            th [ classList [ ( "on", m.sortBy == s ) ], onClick (SortOn s) ] [ text label ]
    in
    div []
        [ div [ class "toolbar" ]
            [ input [ placeholder "Find…", value m.filter, onInput Filter ] []
            , span [ class "note" ] [ text (String.fromInt (List.length rows) ++ " items") ]
            ]
        , div [ class "scroll" ]
            [ table [ class "list" ]
                [ thead [] [ tr [] [ th_ "Name" ByName, th_ "Kind" ByLang, th_ "★" ByStars, th_ "Pushed" ByPushed ] ]
                , tbody []
                    (List.map
                        (\r ->
                            tr [ onClick (SelectRepo r), classList [ ( "sel", Maybe.map .fullName m.selected == Just r.fullName ) ] ]
                                [ td [] [ text r.fullName ]
                                , td [] [ text (lang r) ]
                                , td [ class "num" ] [ text (String.fromInt r.stars) ]
                                , td [] [ text (String.left 10 r.pushedAt) ]
                                ]
                        )
                        rows
                    )
                ]
            ]
        ]


viewInfo : Model -> Html Msg
viewInfo m =
    case m.selected of
        Nothing ->
            p [] [ text "Select a repository in the Timeline or the Repositories window." ]

        Just r ->
            let
                row k v =
                    tr [] [ th [] [ text k ], td [] [ v ] ]
            in
            div [ class "info" ]
                [ h3 [] [ text r.fullName ]
                , p [] [ text r.description ]
                , table []
                    [ row "Kind" (text (lang r))
                    , row "Stars" (text (String.fromInt r.stars))
                    , row "Forks" (text (String.fromInt r.forks))
                    , row "Created" (text (String.left 10 r.createdAt))
                    , row "Last push" (text (String.left 10 r.pushedAt))
                    , row "Topics" (text (String.join ", " r.topics))
                    , case r.starredAt of
                        Just s ->
                            row "Starred" (text (String.left 10 s))

                        Nothing ->
                            text ""
                    ]
                , div [ class "buttons" ]
                    [ a [ class "btn", href r.url ] [ text "Open on GitHub" ]
                    , if r.homepage /= "" then
                        a [ class "btn", href r.homepage ] [ text "Homepage" ]

                      else
                        text ""
                    , button [ class "btn", onClick (RunPreset Bottom (similarTo r.fullName)) ] [ text "Similar repos" ]
                    , a [ class "btn default", href Common.fundUrl ] [ text "♥ Fund this" ]
                    ]
                ]



-- LOGIC WINDOW


viewLogic : Model -> Html Msg
viewLogic m =
    let
        engineBtn e label =
            button [ classList [ ( "btn", True ), ( "default", m.engine == e ) ], onClick (SetEngine e) ] [ text label ]
    in
    div [ class "query" ]
        [ div [ class "toolbar" ]
            [ select [ on "change" (D.map (\i -> List.drop (String.toInt i |> Maybe.withDefault 0) presets |> List.head |> Maybe.map (\( _, e, p ) -> RunPreset e p) |> Maybe.withDefault Solve) (D.at [ "target", "value" ] D.string)) ]
                (List.indexedMap (\i ( t, _, _ ) -> option [ value (String.fromInt i) ] [ text t ]) presets)
            , engineBtn Bottom "Datalog"
            , engineBtn TopDown "μKanren"
            , button [ class "btn default", onClick Solve ] [ text "Run ⌘" ]
            ]
        , textarea [ value m.program, onInput SetProgram, spellcheck False, rows 9 ] []
        , details [ class "note" ]
            [ summary [] [ text "Facts you can use" ]
            , table [] (List.map (\( p, args, about ) -> tr [] [ td [] [ code [] [ text (p ++ "(" ++ args ++ ")") ] ], td [] [ text about ] ]) Facts.catalog)
            , p [] [ text "Datalog solves bottom-up with semi-naive evaluation and gives every answer. μKanren searches top-down, interleaving, and gives the first answers. GH Archive facts cover 2023-01 to 2026-07, with a gap from 2024-06 to 2025-09." ]
            ]
        , case m.run of
            Idle ->
                text ""

            Loading need ->
                p [ class "loading" ] [ text ("Loading GH Archive facts: " ++ String.join ", " need ++ "…") ]

            Solving ->
                p [ class "loading" ] [ text "Solving…" ]

            Failed e ->
                pre [ class "error" ] [ text e ]

            Answers vars rows stats ->
                div []
                    [ p [ class "note" ] [ text stats ]
                    , div [ class "scroll" ]
                        [ table [ class "list" ]
                            [ thead [] [ tr [] (List.map (\c -> th [] [ text c ]) vars) ]
                            , tbody []
                                (rows
                                    |> List.take 1000
                                    |> List.map
                                        (\r ->
                                            tr []
                                                (List.map
                                                    (\v ->
                                                        let
                                                            s =
                                                                Horn.showVal v
                                                        in
                                                        td []
                                                            [ if String.contains "/" s && not (String.contains " " s) then
                                                                a [ href ("https://github.com/" ++ s) ] [ text s ]

                                                              else
                                                                text s
                                                            ]
                                                    )
                                                    r
                                                )
                                        )
                                )
                            ]
                        ]
                    ]
        ]



-- ACTIVITY


viewActivity : Model -> Html Msg
viewActivity m =
    case List.filter (\y -> y.year == m.year) m.years |> List.head of
        Nothing ->
            p [ class "loading" ] [ text "Loading…" ]

        Just yr ->
            let
                peak =
                    List.map Tuple.second yr.days |> List.maximum |> Maybe.withDefault 1 |> Basics.max 1

                level c =
                    if c == 0 then
                        "0"

                    else
                        String.fromInt (Basics.min 4 (1 + (c * 4 - 1) // peak))

                cells =
                    List.indexedMap
                        (\i ( d, c ) ->
                            Svg.rect
                                [ SA.x (String.fromInt (i // 7 * 12))
                                , SA.y (String.fromInt (modBy 7 i * 12))
                                , SA.width "10"
                                , SA.height "10"
                                , SA.class ("l" ++ level c)
                                ]
                                [ Svg.title [] [ Svg.text (d ++ ": " ++ String.fromInt c) ] ]
                        )
                        yr.days
            in
            div [ class "activity" ]
                [ div [ class "years" ]
                    (List.map
                        (\y -> button [ classList [ ( "btn", True ), ( "default", y.year == m.year ) ], onClick (SetYear y.year) ] [ text (String.fromInt y.year) ])
                        (List.reverse m.years)
                    )
                , p [] [ strong [] [ text (String.fromInt yr.total) ], text (" public contributions in " ++ String.fromInt yr.year) ]
                , Svg.svg [ SA.viewBox "0 0 640 86", SA.class "heat" ] cells
                , div [ class "scroll" ]
                    [ table [ class "list" ]
                        [ thead [] [ tr [] [ th [] [ text "Repository" ], th [] [ text "Commits" ], th [] [ text "PRs" ], th [] [ text "Issues" ] ] ]
                        , tbody []
                            (yr.repos
                                |> List.sortBy (\r -> negate (r.commits + r.prs + r.issues))
                                |> List.map
                                    (\r ->
                                        tr [ onClick (SelectName r.repo) ]
                                            [ td [] [ a [ href ("https://github.com/" ++ r.repo) ] [ text r.repo ] ]
                                            , td [ class "num" ] [ text (String.fromInt r.commits) ]
                                            , td [ class "num" ] [ text (String.fromInt r.prs) ]
                                            , td [ class "num" ] [ text (String.fromInt r.issues) ]
                                            ]
                                    )
                            )
                        ]
                    ]
                ]



-- APPEARANCE AND ABOUT


viewAppearance : Model -> Html Msg
viewAppearance m =
    div [ class "appearance" ]
        [ input [ placeholder "Filter schemes…", value m.schemeQuery, onInput SchemeQuery ] []
        , div [ class "scroll" ]
            [ ul []
                (Common.searchSchemes m.schemeQuery m.schemes
                    |> List.take 300
                    |> List.map
                        (\s ->
                            li
                                [ classList [ ( "sel", Maybe.map .id m.preview == Just s.id ), ( "saved", s.id == m.saved ) ]
                                , onClick (Preview s)
                                ]
                                (List.map (\k -> span [ class "dot", style "background" (Dict.get k s.palette |> Maybe.withDefault "") ] []) [ "base00", "base01", "base08", "base0A", "base0B", "base0D", "base0E", "base0F" ]
                                    ++ [ text s.id ]
                                )
                        )
                )
            ]
        , div [ class "buttons" ]
            [ span [ class "note" ] [ text ("Saved: " ++ m.saved) ]
            , button [ class "btn default", onClick SaveScheme ] [ text "Save for every subdomain" ]
            ]
        ]


viewAbout : Model -> Html Msg
viewAbout m =
    let
        repos =
            List.filter (not << .fork) m.repos

        stat label v =
            tr [] [ th [] [ text label ], td [ class "num" ] [ text v ] ]
    in
    div [ class "about" ]
        [ h3 [] [ text "vic's open source" ]
        , p [] [ text "Compilers, effect systems, Nix, and whatever I fell into this week." ]
        , table []
            [ stat "Own repositories" (String.fromInt (List.length repos))
            , stat "Stars received" (String.fromInt (List.sum (List.map .stars repos)))
            , stat "Repositories starred" (String.fromInt (List.length m.stars))
            , stat "Public contributions" (String.fromInt (List.sum (List.map .total m.years)))
            , stat "Years on GitHub" (String.fromInt (List.length m.years))
            ]
        , div [ class "buttons" ]
            [ a [ class "btn", href "https://github.com/vic" ] [ text "GitHub" ]
            , a [ class "btn default", href Common.fundUrl ] [ text "♥ Sponsor" ]
            ]
        ]


{-| The window a link opens next to the Timeline: `codes.oeiuwq.com/#logic`.
-}
fromHash : String -> List Win
fromHash hash =
    if hash == "" then
        []

    else
        List.filter (\w -> w /= Timeline && String.startsWith (String.toLower hash) (String.toLower (winTitle w))) allWins |> List.take 1
