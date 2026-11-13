port module Adventure exposing (main)

{-| adventure.oeiuwq.com: a text adventure on a Commodore-style screen. The
story is a text file that anyone can edit here (EDIT) and run again. The
story and the game in progress are saved in this browser after every command.
-}

import Browser
import Browser.Dom as Dom
import Browser.Navigation as Nav
import Common exposing (Flags)
import Dict
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick, onInput, onSubmit, stopPropagationOn)
import Json.Decode as D
import Json.Encode as E
import Tale
import Task


port store : Maybe String -> Cmd msg


type alias Model =
    { flags : Flags
    , story : Tale.Story
    , source : String
    , world : Tale.World
    , log : List String
    , line : String
    , editing : Bool
    , draft : String
    , error : Maybe String
    }


type Msg
    = Line String
    | Enter
    | Focus
    | Noop
    | Edit Bool
    | Draft String
    | RunDraft
    | ResetDraft


boot : List String
boot =
    [ "    **** OEIUWQ 64 BASIC V2 ****", "", " 64K RAM SYSTEM  38911 BASIC BYTES FREE", "", "READY.", "LOAD\"$\",8" ] ++ directory ++ [ "READY.", "LOAD\"ADVENTURE\",8,1", "", "SEARCHING FOR ADVENTURE", "LOADING", "READY.", "RUN", "" ]


defaultStory : Tale.Story
defaultStory =
    Tale.parse Tale.defaultSource |> Result.withDefault { title = "", intro = [], start = "", rooms = [], items = [], guards = [], wins = [] }


main : Program D.Value Model Msg
main =
    Browser.element { init = init, update = update, view = view, subscriptions = \_ -> Sub.none }


opening : Tale.Story -> List String
opening s =
    Tale.intro s ++ Tuple.second (Tale.run s "look" (Tale.new s))


init : D.Value -> ( Model, Cmd Msg )
init v =
    let
        flags =
            D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }

        saved =
            D.decodeValue (D.field "stored" (D.nullable D.string)) v
                |> Result.toMaybe
                |> Maybe.andThen identity
                |> Maybe.andThen
                    (D.decodeString
                        (D.map3 (\src w l -> ( src, w, l ))
                            (D.oneOf [ D.field "source" D.string, D.succeed Tale.defaultSource ])
                            (D.field "world" Tale.decode)
                            (D.field "log" (D.list D.string))
                        )
                        >> Result.toMaybe
                    )

        base =
            { flags = flags, story = defaultStory, source = Tale.defaultSource, world = Tale.new defaultStory, log = boot ++ opening defaultStory, line = "", editing = False, draft = Tale.defaultSource, error = Nothing }
    in
    case saved |> Maybe.andThen (\( src, w, log ) -> Tale.parse src |> Result.toMaybe |> Maybe.map (\s -> ( s, src, ( w, log ) ))) of
        Just ( s, src, ( w, log ) ) ->
            ( { base | story = s, source = src, draft = src, world = w, log = log ++ [ "", "(Your saved game is back. Type RESTART for a new one.)", "" ] }, scroll )

        Nothing ->
            ( base, scroll )


scroll : Cmd Msg
scroll =
    Cmd.batch
        [ Dom.getViewportOf "c64-out" |> Task.andThen (\vp -> Dom.setViewportOf "c64-out" 0 vp.scene.height) |> Task.attempt (\_ -> Noop)
        , Task.attempt (\_ -> Noop) (Dom.focus "c64-in")
        ]


save : Model -> Cmd Msg
save m =
    store (Just (E.encode 0 (E.object [ ( "source", E.string m.source ), ( "world", Tale.encode m.world ), ( "log", E.list E.string m.log ) ])))


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        Line s ->
            ( { m | line = s }, Cmd.none )

        Focus ->
            ( m
            , if m.editing then
                Cmd.none

              else
                Task.attempt (\_ -> Noop) (Dom.focus "c64-in")
            )

        Noop ->
            ( m, Cmd.none )

        Edit open ->
            ( { m | editing = open, draft = m.source, error = Nothing }, Cmd.none )

        Draft s ->
            ( { m | draft = s }, Cmd.none )

        ResetDraft ->
            ( { m | draft = Tale.defaultSource, error = Nothing }, Cmd.none )

        RunDraft ->
            case Tale.parse m.draft of
                Ok s ->
                    let
                        m2 =
                            { m | story = s, source = m.draft, world = Tale.new s, log = boot ++ opening s, editing = False, error = Nothing }
                    in
                    ( m2, Cmd.batch [ save m2, scroll ] )

                Err e ->
                    ( { m | error = Just e }, Cmd.none )

        Enter ->
            let
                cmd =
                    String.toLower (String.trim m.line)

                loadName =
                    String.replace "\"" "" (String.trim (String.dropLeft 4 cmd)) |> String.replace ",8,1" "" |> String.replace ",8" ""

                target =
                    if String.startsWith "load" cmd && loadName /= "$" then
                        List.filter (\pl -> String.toLower pl.name == loadName || String.toLower pl.title == loadName) Common.places |> List.head

                    else
                        Nothing

                ( w, said ) =
                    if List.member cmd [ "dir", "$", "list", "load \"$\",8", "load$" ] || String.startsWith "load \"$" cmd then
                        ( m.world, directory )

                    else if String.startsWith "load" cmd then
                        case target of
                            Just pl ->
                                ( m.world, [ "SEARCHING FOR " ++ String.toUpper pl.name, "LOADING", "READY." ] )

                            Nothing ->
                                ( m.world, [ "?FILE NOT FOUND  ERROR", "Type DIR to see the disk." ] )

                    else
                        Tale.run m.story m.line m.world

                log =
                    List.reverse (List.take 400 (List.reverse (m.log ++ [ "", "> " ++ m.line ] ++ said)))

                m2 =
                    { m | world = w, log = log, line = "", editing = cmd == "edit", draft = m.source, error = Nothing }
            in
            ( m2
            , Cmd.batch
                [ save m2
                , scroll
                , case target of
                    Just pl ->
                        Nav.load (Common.site m.flags pl.name)

                    Nothing ->
                        Cmd.none
                , if cmd == "sponsor" then
                    Nav.load Common.fundUrl

                  else
                    Cmd.none
                ]
            )


view : Model -> Html Msg
view m =
    div [ class "c64" ]
        [ div [ class "c64-screen", onClick Focus ]
            [ div [ class "c64-top" ]
                [ pre [ class "c64-art" ] [ text (String.join "\n" (Tale.art m.story m.world.room)) ]
                , div [ class "c64-status" ] [ span [] [ text (Tale.roomName m.story m.world.room) ], span [] [ text ("SCORE " ++ String.fromInt m.world.score ++ "  MOVES " ++ String.fromInt m.world.moves) ] ]
                ]
            , div [ class "c64-out", id "c64-out" ]
                (List.map
                    (\l ->
                        p []
                            [ text
                                (if l == "" then
                                    "\u{00A0}"

                                 else
                                    l
                                )
                            ]
                    )
                    m.log
                )
            , Html.form [ class "c64-prompt", onSubmit Enter ]
                [ span [] [ text ">" ]
                , input [ id "c64-in", value m.line, onInput Line, autocomplete False, spellcheck False, attribute "aria-label" "Command" ] []
                ]
            ]
        , p [ class "c64-foot" ] [ text "TYPE HELP TO PLAY, DIR TO SEE THE DISK, EDIT STORY TO WRITE YOUR OWN" ]
        , nav [ class "c64-disk" ] (List.map (\pl -> a [ href (Common.site m.flags pl.name), title pl.blurb ] [ text ("LOAD \"" ++ String.toUpper pl.name ++ "\"") ]) (Common.placesBut "adventure"))
        , button [ class "edit-btn", stopPropagationOn "click" (D.succeed ( Edit True, True )) ] [ text "EDIT STORY" ]
        , if m.editing then
            Common.editor
                { title = "Story file: " ++ m.story.title
                , help = "Rooms, items, exits, locks, darkness, a guard and a way to win. Change anything, then Run: the game restarts with your story."
                , source = m.draft
                , error = m.error
                , onInput = Draft
                , onRun = RunDraft
                , onReset = ResetDraft
                , onClose = Edit False
                }

          else
            text ""
        ]


{-| The disk: every corner of oeiuwq.com as a program to LOAD.
-}
directory : List String
directory =
    [ "0 \"OEIUWQ DISK     \" 26 2A" ]
        ++ List.indexedMap (\i pl -> String.padRight 5 ' ' (String.fromInt (8 + 3 * i)) ++ String.padRight 19 ' ' ("\"" ++ String.toUpper pl.name ++ "\"") ++ "PRG  " ++ pl.blurb) Common.places
        ++ [ "664 BLOCKS FREE.", "", "LOAD \"NAME\" to run one, eg LOAD \"CODES\"." ]
