module Hub exposing (main)

{-| oeiuwq.com: a BIOS power-on test, then a boot menu of the subdomains.
DEL opens SETUP, where the visitor picks the color scheme of every subdomain.
-}

import Browser
import Browser.Navigation as Nav
import Common exposing (Flags, Scheme)
import Dict
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick, onInput, onMouseEnter, onSubmit)
import Http
import Json.Decode as D
import Process
import Task


type alias Profile =
    { followers : Int, publicRepos : Int, createdAt : String }


type Screen
    = Post Int
    | Menu
    | Setup


type alias Model =
    { flags : Flags
    , screen : Screen
    , sel : Int
    , profile : Maybe Profile
    , schemes : List Scheme
    , query : String
    , pick : Int
    , preview : Maybe Scheme
    , saved : String
    }


type Msg
    = Tick
    | Key String
    | Select Int
    | Boot Int
    | OpenSetup
    | GotProfile (Result Http.Error Profile)
    | GotSchemes (Result Http.Error (List Scheme))
    | Query String
    | Pick Int
    | Saved String (Result Http.Error ())


entries : List ( String, String )
entries =
    List.map (\p -> ( p.name, p.blurb )) (Common.placesBut "home")


main : Program D.Value Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , view = view
        , subscriptions = \_ -> Common.onKey Key
        }


init : D.Value -> ( Model, Cmd Msg )
init v =
    let
        flags =
            D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }
    in
    ( { flags = flags, screen = Post 0, sel = 0, profile = Nothing, schemes = [], query = "", pick = 0, preview = Nothing, saved = flags.scheme }
    , Cmd.batch
        [ Common.getJson "/api/profile"
            (D.map3 Profile (D.field "followers" D.int) (D.field "publicRepos" D.int) (D.field "createdAt" D.string))
            GotProfile
        , tick
        ]
    )


tick : Cmd Msg
tick =
    Task.perform (\_ -> Tick) (Process.sleep 260)


postLines : Model -> List String
postLines m =
    let
        p =
            m.profile

        num f =
            Maybe.map (f >> String.fromInt) p |> Maybe.withDefault "...."
    in
    [ "oeiuwq BIOS v2026.11, (C) 1999-2026 Victor Borja"
    , ""
    , "Main processor : functional, effects, interaction nets"
    , "Memory test    : 25+ years of open source  OK"
    , "GitHub user    : #331, vic, since " ++ (Maybe.map (.createdAt >> String.left 4) p |> Maybe.withDefault "....")
    , "Public repos   : " ++ num .publicRepos
    , "Followers      : " ++ num .followers
    , "Location       : Mexico City"
    , ""
    , "Detecting subdomains ... " ++ String.fromInt (List.length entries) ++ " found"
    ]


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        Tick ->
            case m.screen of
                Post n ->
                    if n >= List.length (postLines m) + 2 then
                        ( { m | screen = Menu }, Cmd.none )

                    else
                        ( { m | screen = Post (n + 1) }, tick )

                _ ->
                    ( m, Cmd.none )

        GotProfile r ->
            ( { m | profile = Result.toMaybe r }, Cmd.none )

        Select i ->
            ( { m | sel = i }, Cmd.none )

        Boot i ->
            ( m, go m i )

        OpenSetup ->
            openSetup m

        GotSchemes r ->
            let
                ss =
                    Result.withDefault [] r
            in
            ( { m | schemes = ss, pick = indexOf m.saved (List.map .id ss) }, Cmd.none )

        Query q ->
            ( { m | query = q, pick = 0 }, Cmd.none )

        Pick i ->
            ( previewAt i m, Cmd.none )

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

        Key k ->
            key k m


openSetup : Model -> ( Model, Cmd Msg )
openSetup m =
    ( { m | screen = Setup }
    , if List.isEmpty m.schemes then
        Common.getJson "/api/themes" (D.list Common.schemeDecoder) GotSchemes

      else
        Cmd.none
    )


go : Model -> Int -> Cmd Msg
go m i =
    case List.drop i entries |> List.head of
        Just ( name, _ ) ->
            Nav.load (Common.site m.flags name)

        Nothing ->
            Cmd.none


indexOf : a -> List a -> Int
indexOf x xs =
    List.indexedMap Tuple.pair xs |> List.filter (\( _, y ) -> y == x) |> List.head |> Maybe.map Tuple.first |> Maybe.withDefault 0


filtered : Model -> List Scheme
filtered m =
    Common.searchSchemes m.query m.schemes


previewAt : Int -> Model -> Model
previewAt i m =
    let
        n =
            List.length (filtered m)

        j =
            clamp 0 (Basics.max 0 (n - 1)) i
    in
    { m | pick = j, preview = List.drop j (filtered m) |> List.head }


key : String -> Model -> ( Model, Cmd Msg )
key k m =
    case m.screen of
        Post _ ->
            if k == "Delete" then
                openSetup m

            else
                ( { m | screen = Menu }, Cmd.none )

        Menu ->
            case k of
                "ArrowDown" ->
                    ( { m | sel = modBy (List.length entries) (m.sel + 1) }, Cmd.none )

                "ArrowUp" ->
                    ( { m | sel = modBy (List.length entries) (m.sel - 1) }, Cmd.none )

                "Enter" ->
                    ( m, go m m.sel )

                "Delete" ->
                    openSetup m

                _ ->
                    ( m, Cmd.none )

        Setup ->
            case k of
                "ArrowDown" ->
                    ( previewAt (m.pick + 1) m, Cmd.none )

                "ArrowUp" ->
                    ( previewAt (m.pick - 1) m, Cmd.none )

                "Enter" ->
                    case m.preview of
                        Just s ->
                            ( m, Common.saveScheme (Saved s.id) s.id )

                        Nothing ->
                            ( m, Cmd.none )

                "Escape" ->
                    ( { m | screen = Menu, preview = Nothing }, Cmd.none )

                _ ->
                    ( m, Cmd.none )


view : Model -> Html Msg
view m =
    div [ class "crt" ]
        [ case m.preview of
            Just s ->
                node "style" [] [ text (Common.schemeCss s) ]

            Nothing ->
                text ""
        , case m.screen of
            Post n ->
                viewPost m n

            Menu ->
                viewMenu m

            Setup ->
                viewSetup m
        ]


viewPost : Model -> Int -> Html Msg
viewPost m n =
    div [ class "post", onClick (Key " ") ]
        [ pre [] [ text (String.join "\n" (List.take n (postLines m))) ]
        , p [ class "hint" ] [ text "Press DEL to enter SETUP, any other key to skip" ]
        ]


viewMenu : Model -> Html Msg
viewMenu m =
    div [ class "menu" ]
        [ h1 [] [ text "oeiuwq boot manager" ]
        , ul [ class "boot" ]
            (List.indexedMap
                (\i ( name, desc ) ->
                    li [ classList [ ( "sel", i == m.sel ) ], onMouseEnter (Select i) ]
                        [ a [ href (Common.site m.flags name) ]
                            [ span [ class "name" ] [ text name ], span [ class "desc" ] [ text desc ] ]
                        ]
                )
                entries
            )
        , p [ class "hint" ]
            [ text "Use ↑ and ↓ to select, Enter to boot. "
            , button [ onClick OpenSetup ] [ text "DEL" ]
            , text " opens SETUP (colors)."
            ]
        , h1 [] [ text "Things to try" ]
        , ul [ class "try" ]
            (List.map (\( label, url ) -> li [] [ a [ href url ] [ text label ] ])
                [ ( "Ask my repos questions in Datalog or μKanren", Common.site m.flags "codes" ++ "#logic" )
                , ( "See what I worked on, year by year", Common.site m.flags "codes" ++ "#activity" )
                , ( "Find a repo by any word of its README", Common.site m.flags "stars" )
                , ( "Write me a love letter, F2 sends it", Common.site m.flags "love" )
                , ( "Play a game, then edit it and play your version", Common.site m.flags "adventure" )
                , ( "Read the map of this site", Common.site m.flags "blog" ++ "#2026-11-12-01-welcome" )
                , ( "Why I ask for sponsors", Common.site m.flags "blog" ++ "#2026-11-12-09-funding" )
                ]
                ++ [ li [] [ button [ onClick OpenSetup ] [ text "Pick the colors of every page (DEL)" ] ] ]
            )
        , footer [] (List.map (\( t, u ) -> a [ href u ] [ text t ]) Common.socials)
        ]


viewSetup : Model -> Html Msg
viewSetup m =
    div [ class "setup" ]
        [ h1 [] [ text "CMOS Setup Utility · Color scheme" ]
        , div [ class "panes" ]
            [ div [ class "list" ]
                [ Html.form [ onSubmit (Key "Enter") ] [ input [ placeholder "type to filter, e.g. rebecca", value m.query, onInput Query, autofocus True ] [] ]
                , ul []
                    (List.indexedMap
                        (\i s ->
                            li [ classList [ ( "sel", i == m.pick ), ( "saved", s.id == m.saved ) ], onClick (Pick i) ]
                                [ text s.id ]
                        )
                        (filtered m |> List.take 300)
                    )
                ]
            , div [ class "help" ]
                [ p [] [ text "Every subdomain of oeiuwq.com uses the 16 colors of a base16 scheme." ]
                , p [] [ text "Saved: ", strong [] [ text m.saved ] ]
                , div [ class "swatch" ] (List.map (\i -> span [ style "background" ("var(--base0" ++ String.slice i (i + 1) "0123456789ABCDEF" ++ ")") ] []) (List.range 0 15))
                , p [] [ text "↑↓ preview · Enter save · Esc exit" ]
                , button [ onClick (Key "Enter") ] [ text "Save" ]
                , button [ onClick (Key "Escape") ] [ text "Exit" ]
                ]
            ]
        ]
