module Projects exposing (main)

{-| projects.oeiuwq.com: a Borland Turbo Vision IDE. Every own project is a
source file in the project window; its README opens in the editor window,
and the message window says what it is. Windows have double-line frames,
scroll bars and drop shadows; F-keys work like in the old IDEs.
-}

import Browser
import Browser.Dom as Dom
import Browser.Navigation as Nav
import Common exposing (Flags, Repo)
import Dict
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (on, onClick, onDoubleClick, onInput, stopPropagationOn)
import Http
import Json.Decode as D
import Task
import Url


type Dialog
    = OpenFile
    | About


type alias Model =
    { flags : Flags
    , repos : List Repo
    , sel : Int
    , file : Maybe Repo
    , text : Maybe String
    , dialog : Maybe Dialog
    , menu : Maybe String
    , filter : String
    , thumb : Float
    }


type Msg
    = GotRepos (Result Http.Error (List Repo))
    | GotText String (Result Http.Error String)
    | Select Int
    | OpenRepo Repo
    | Show (Maybe Dialog)
    | Menu (Maybe String)
    | Filter String
    | Key String
    | Scrolled Float
    | ScrollBy Float
    | Go String
    | Noop


main : Program D.Value Model Msg
main =
    Browser.element { init = init, update = update, view = view, subscriptions = \_ -> Common.onKey Key }


init : D.Value -> ( Model, Cmd Msg )
init v =
    ( { flags = D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }
      , repos = []
      , sel = 0
      , file = Nothing
      , text = Nothing
      , dialog = Nothing
      , menu = Nothing
      , filter = ""
      , thumb = 0
      }
    , Common.getJson "/api/repos" (D.list Common.repoDecoder) GotRepos
    )


{-| Own projects, not forks, last pushed first.
-}
projects : Model -> List Repo
projects m =
    m.repos |> List.filter (not << .fork) |> List.sortBy .pushedAt |> List.reverse


filtered : Model -> List Repo
filtered m =
    let
        f =
            String.toLower m.filter
    in
    List.filter (\r -> String.contains f (String.toLower (r.name ++ " " ++ r.description ++ " " ++ r.language))) (projects m)


{-| A project as an 8.3 file name, the way Turbo Pascal would list it.
-}
fileName : Repo -> String
fileName r =
    let
        ext =
            case r.language of
                "Rust" ->
                    "RS"

                "Nix" ->
                    "NIX"

                "Go" ->
                    "GO"

                "Elixir" ->
                    "EX"

                "Scala" ->
                    "SCA"

                "Ruby" ->
                    "RB"

                "JavaScript" ->
                    "JS"

                "TypeScript" ->
                    "TS"

                "Elm" ->
                    "ELM"

                "Emacs Lisp" ->
                    "EL"

                "Shell" ->
                    "SH"

                "Java" ->
                    "JAV"

                "Haskell" ->
                    "HS"

                _ ->
                    "MD"
    in
    String.toUpper (String.left 8 (String.filter Char.isAlphaNum r.name)) ++ "." ++ ext


open : Repo -> Model -> ( Model, Cmd Msg )
open r m =
    ( { m | file = Just r, text = Nothing, dialog = Nothing, menu = Nothing, thumb = 0 }
    , Cmd.batch
        [ Http.get { url = "/api/readme?repo=" ++ Url.percentEncode r.fullName, expect = Http.expectString (GotText r.fullName) }
        , Task.attempt (\_ -> Noop) (Dom.setViewportOf "editor" 0 0)
        ]
    )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        GotRepos r ->
            let
                m2 =
                    { m | repos = Result.withDefault [] r }

                start =
                    projects m2
                        |> List.filter (\p -> p.name == m.flags.hash)
                        |> List.head
                        |> (\x ->
                                case x of
                                    Just p ->
                                        Just p

                                    Nothing ->
                                        List.head (projects m2)
                           )
            in
            case start of
                Just p ->
                    open p { m2 | sel = indexIn p (projects m2) }

                Nothing ->
                    ( m2, Cmd.none )

        GotText name r ->
            if Maybe.map .fullName m.file == Just name then
                ( { m
                    | text =
                        Just
                            (Result.withDefault "(no README)" r
                                |> (\t ->
                                        if String.trim t == "" then
                                            "(no README)"

                                        else
                                            t
                                   )
                            )
                  }
                , Cmd.none
                )

            else
                ( m, Cmd.none )

        Select i ->
            ( { m | sel = i }, Cmd.none )

        OpenRepo r ->
            open r m

        Show d ->
            ( { m | dialog = d, menu = Nothing, filter = "" }
            , if d == Just OpenFile then
                Task.attempt (\_ -> Noop) (Dom.focus "open-name")

              else
                Cmd.none
            )

        Menu name ->
            ( { m
                | menu =
                    if m.menu == name then
                        Nothing

                    else
                        name
              }
            , Cmd.none
            )

        Filter s ->
            ( { m | filter = s, sel = 0 }, Cmd.none )

        Scrolled t ->
            ( { m | thumb = t }, Cmd.none )

        ScrollBy dy ->
            ( m
            , Dom.getViewportOf "editor"
                |> Task.andThen (\vp -> Dom.setViewportOf "editor" 0 (vp.viewport.y + dy))
                |> Task.attempt (\_ -> Noop)
            )

        Go url ->
            ( { m | menu = Nothing }, Nav.load url )

        Noop ->
            ( m, Cmd.none )

        Key k ->
            key k m


key : String -> Model -> ( Model, Cmd Msg )
key k m =
    let
        list =
            if m.dialog == Just OpenFile then
                filtered m

            else
                projects m

        n =
            List.length list
    in
    case k of
        "ArrowDown" ->
            ( { m | sel = Basics.min (n - 1) (m.sel + 1) }, Cmd.none )

        "ArrowUp" ->
            ( { m | sel = Basics.max 0 (m.sel - 1) }, Cmd.none )

        "Enter" ->
            case List.drop m.sel list |> List.head of
                Just r ->
                    open r m

                Nothing ->
                    ( m, Cmd.none )

        "PageDown" ->
            update (ScrollBy 300) m

        "PageUp" ->
            update (ScrollBy -300) m

        "F1" ->
            update (Show (Just About)) m

        "F2" ->
            update (Go Common.fundUrl) m

        "F3" ->
            update (Show (Just OpenFile)) m

        "F9" ->
            case m.file of
                Just r ->
                    update (Go r.url) m

                Nothing ->
                    ( m, Cmd.none )

        "F10" ->
            ( { m | menu = Just "File" }, Cmd.none )

        "Escape" ->
            ( { m | dialog = Nothing, menu = Nothing }, Cmd.none )

        _ ->
            ( m, Cmd.none )


indexIn : Repo -> List Repo -> Int
indexIn r rs =
    List.indexedMap Tuple.pair rs |> List.filter (\( _, x ) -> x.fullName == r.fullName) |> List.head |> Maybe.map Tuple.first |> Maybe.withDefault 0



-- VIEW


stop : msg -> Attribute msg
stop msg =
    stopPropagationOn "click" (D.succeed ( msg, True ))


hot : String -> Html msg
hot label =
    span [] [ span [ class "hot" ] [ text (String.left 1 label) ], text (String.dropLeft 1 label) ]


{-| A Turbo Vision window: a double-line frame, the title in the top edge,
a close box, and a drop shadow.
-}
window : String -> String -> Int -> List (Html Msg) -> Html Msg
window cls title_ num body =
    section [ class ("tv-win " ++ cls) ]
        [ div [ class "tv-frame" ]
            [ span [ class "tv-close" ] [ text "[■]" ]
            , span [ class "tv-wtitle" ] [ text (" " ++ title_ ++ " ") ]
            , span [ class "tv-num" ] [ text (String.fromInt num ++ "═[↕]") ]
            ]
        , div [ class "tv-in" ] body
        ]


view : Model -> Html Msg
view m =
    let
        go =
            Common.site m.flags

        menus =
            [ ( "File", [ ( "Open...", "F3", Show (Just OpenFile) ), ( "Go to oeiuwq.com", "", Go (go "home") ), ( "Exit", "Alt-X", Go (go "home") ) ] )
            , ( "Run", [ ( "Run on GitHub", "F9", Key "F9" ), ( "Sponsor this", "F2", Go Common.fundUrl ) ] )
            , ( "Search", [ ( "Find in every README...", "", Go (go "stars") ) ] )
            , ( "Project", [ ( "Timeline (codes)", "", Go (go "codes") ), ( "Logic window", "", Go (go "codes" ++ "#logic") ) ] )
            , ( "Window", List.indexedMap (\i pl -> ( pl.title ++ "  " ++ pl.blurb, "Alt-" ++ String.fromInt (modBy 10 (i + 1)), Go (go pl.name) )) (Common.placesBut "projects") )
            , ( "Help", [ ( "About...", "F1", Show (Just About) ) ] )
            ]

        menuBar =
            nav [ class "tv-menu" ]
                (span [ class "tv-sys" ] [ text "≡" ]
                    :: List.map
                        (\( name, items ) ->
                            div [ class "tv-m" ]
                                [ button [ classList [ ( "tv-mt", True ), ( "on", m.menu == Just name ) ], stop (Menu (Just name)) ] [ hot name ]
                                , if m.menu == Just name then
                                    div [ class "tv-drop" ]
                                        (List.map
                                            (\( label, k, msg ) ->
                                                case msg of
                                                    Go url ->
                                                        a [ class "tv-item", href url ] [ hot label, span [ class "tv-k" ] [ text k ] ]

                                                    _ ->
                                                        button [ class "tv-item", stop msg ] [ hot label, span [ class "tv-k" ] [ text k ] ]
                                            )
                                            items
                                        )

                                  else
                                    text ""
                                ]
                        )
                        menus
                )
    in
    div [ class "tv", onClick (Menu Nothing) ]
        [ menuBar
        , main_ [ class "tv-desk" ]
            [ window "tv-project"
                "Project: VIC.PRJ"
                1
                [ div [ class "tv-cols" ] [ span [] [ text "File name" ], span [] [ text "★" ], span [] [ text "Year" ] ]
                , ul [ class "tv-list" ]
                    (List.indexedMap
                        (\i r ->
                            li
                                [ classList [ ( "sel", i == m.sel && m.dialog == Nothing ), ( "open", Maybe.map .fullName m.file == Just r.fullName ) ]
                                , onClick (Select i)
                                , onDoubleClick (OpenRepo r)
                                ]
                                [ span [] [ text (fileName r) ], span [] [ text (String.fromInt r.stars) ], span [] [ text (String.left 4 r.pushedAt) ] ]
                        )
                        (projects m)
                    )
                ]
            , window "tv-editor"
                (Maybe.map fileName m.file |> Maybe.withDefault "NONAME00.PAS")
                2
                [ div [ class "tv-edit" ]
                    [ div
                        [ class "tv-text"
                        , id "editor"
                        , on "scroll"
                            (D.map3 (\t h c -> Scrolled (t / Basics.max 1 (h - c)))
                                (D.at [ "target", "scrollTop" ] D.float)
                                (D.at [ "target", "scrollHeight" ] D.float)
                                (D.at [ "target", "clientHeight" ] D.float)
                            )
                        ]
                        [ case m.text of
                            Nothing ->
                                text "Loading..."

                            Just t ->
                                Maybe.map (\r -> Common.readme r.fullName t) m.file |> Maybe.withDefault (text t)
                        ]
                    , div [ class "tv-sb" ]
                        [ button [ onClick (ScrollBy -60), attribute "aria-label" "Scroll up" ] [ text "▲" ]
                        , div [ class "tv-track" ] [ span [ class "tv-thumb", style "top" (String.fromFloat (100 * m.thumb) ++ "%") ] [ text "■" ] ]
                        , button [ onClick (ScrollBy 60), attribute "aria-label" "Scroll down" ] [ text "▼" ]
                        ]
                    ]
                ]
            , window "tv-message"
                "Message"
                3
                (case m.file of
                    Just r ->
                        [ p []
                            [ text
                                ("Compiling "
                                    ++ fileName r
                                    ++ " ... "
                                    ++ (if r.description == "" then
                                            "no description"

                                        else
                                            r.description
                                       )
                                )
                            ]
                        , p []
                            [ text
                                ("Language: "
                                    ++ (if r.language == "" then
                                            "none"

                                        else
                                            r.language
                                       )
                                    ++ "   Stars: "
                                    ++ String.fromInt r.stars
                                    ++ "   Forks: "
                                    ++ String.fromInt r.forks
                                    ++ "   Since: "
                                    ++ String.left 10 r.createdAt
                                )
                            ]
                        , p [ class "ok" ] [ text "Success: ", a [ href r.url ] [ text r.url ], text "   Press F9 to run, F2 to sponsor." ]
                        ]

                    Nothing ->
                        [ p [] [ text "Press F3 to open a project." ] ]
                )
            ]
        , footer [ class "tv-status" ]
            (List.map
                (\( k, label, msg ) -> button [ onClick msg ] [ span [ class "hot" ] [ text k ], text (" " ++ label) ])
                [ ( "F1", "Help", Key "F1" ), ( "F2", "Sponsor", Key "F2" ), ( "F3", "Open", Key "F3" ), ( "F9", "Run", Key "F9" ), ( "F10", "Menu", Key "F10" ), ( "Alt-X", "Exit", Go (go "home") ) ]
            )
        , case m.dialog of
            Nothing ->
                text ""

            Just OpenFile ->
                div [ class "tv-modal" ]
                    [ window "tv-dialog"
                        "Open a File"
                        0
                        [ label [ for "open-name" ] [ hot "Name" ]
                        , Html.form [ Html.Events.onSubmit (Key "Enter") ] [ input [ id "open-name", value m.filter, onInput Filter, autocomplete False ] [] ]
                        , label [] [ hot "Files" ]
                        , ul [ class "tv-list tv-files" ]
                            (List.indexedMap
                                (\i r -> li [ classList [ ( "sel", i == m.sel ) ], onClick (OpenRepo r) ] [ span [] [ text (fileName r) ], span [] [ text r.description ] ])
                                (filtered m |> List.take 200)
                            )
                        , div [ class "tv-buttons" ]
                            [ button [ class "tv-btn", onClick (Key "Enter") ] [ text "Open" ]
                            , button [ class "tv-btn", onClick (Show Nothing) ] [ text "Cancel" ]
                            ]
                        ]
                    ]

            Just About ->
                div [ class "tv-modal" ]
                    [ window "tv-dialog tv-about"
                        "About"
                        0
                        [ p [ class "big" ] [ text "Turbo vic" ]
                        , p [] [ text "Version 2026 · Copyright (c) 1999, 2026 Victor Borja" ]
                        , p [] [ text "Every project here is free and libre. If one saves you time, sponsoring keeps them alive." ]
                        , div [ class "tv-buttons" ]
                            [ a [ class "tv-btn", href Common.fundUrl ] [ text "Sponsor" ]
                            , button [ class "tv-btn", onClick (Show Nothing) ] [ text "OK" ]
                            ]
                        ]
                    ]
        ]
