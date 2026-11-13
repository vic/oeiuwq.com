port module Smalltalk exposing (main)

{-| smalltalk.oeiuwq.com: a Smalltalk-80 style desktop with a Workspace, a
Transcript and a System Browser. The image (classes, methods, workspace and
transcript) is saved in this browser's localStorage after every change.
-}

import Browser
import Browser.Navigation as Nav
import Common exposing (Flags)
import Dict
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (on, onClick, onInput, preventDefaultOn)
import Json.Decode as D
import St


port store : Maybe String -> Cmd msg


type alias Model =
    { flags : Flags
    , machine : St.Machine
    , workspace : String
    , sel : ( Int, Int )
    , cls : Maybe String
    , method : Maybe String
    , code : String
    , status : String
    , confirmReset : Bool
    , world : Bool
    }


type Msg
    = Edit String
    | Selected ( Int, Int )
    | DoIt
    | PrintIt
    | Shortcut String ( Int, Int )
    | PickClass String
    | PickMethod String
    | NewMethod
    | NewClass
    | Code String
    | Accept
    | ClearTranscript
    | Reset
    | Go String
    | World


welcome : String
welcome =
    """"Welcome to Smalltalk in your browser.
Put the cursor on a line (or select some code) and press
Ctrl+D to do it or Ctrl+P to print it. Everything you make
is saved in this browser, so it is still here tomorrow."

3 + 4 * 2.
(1 to: 10) collect: [:i | i * i].
Transcript show: 'Hello from oeiuwq!'; cr.
#(3 1 2) asSortedCollection.

"Teach numbers a new trick:"
Integer compile: 'fib ^self < 2 ifTrue: [self] ifFalse: [(self - 1) fib + (self - 2) fib]'.
15 fib.

"Make a class, then look at it in the System Browser:"
Object subclass: #Counter instanceVariableNames: 'n'.
Counter compile: 'increment n := (n ifNil: [0]) + 1. ^n'.
counter := Counter new.
counter increment; increment; increment.
"""


main : Program D.Value Model Msg
main =
    Browser.element { init = init, update = update, view = view, subscriptions = \_ -> Sub.none }


init : D.Value -> ( Model, Cmd Msg )
init v =
    let
        flags =
            D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }

        image =
            D.decodeValue (D.field "stored" (D.nullable D.string)) v
                |> Result.toMaybe
                |> Maybe.andThen identity
                |> Maybe.andThen (St.decodeImage >> Result.toMaybe)
    in
    ( { flags = flags
      , machine = Maybe.map .machine image |> Maybe.withDefault St.boot
      , workspace = Maybe.map .workspace image |> Maybe.withDefault welcome
      , sel = ( 0, 0 )
      , cls = Nothing
      , method = Nothing
      , code = ""
      , status =
            if image == Nothing then
                "A fresh image."

            else
                "Image restored from this browser."
      , confirmReset = False
      , world = False
      }
    , Cmd.none
    )


{-| The code a do-it runs: the selection, or the line the cursor is on.
-}
target : Model -> ( String, Int )
target m =
    let
        ( a, b ) =
            m.sel
    in
    if a /= b then
        ( String.slice (Basics.min a b) (Basics.max a b) m.workspace, Basics.max a b )

    else
        let
            start =
                String.left a m.workspace |> String.indexes "\n" |> List.reverse |> List.head |> Maybe.map ((+) 1) |> Maybe.withDefault 0

            rest =
                String.dropLeft a m.workspace

            stop =
                a + (String.indexes "\n" rest |> List.head |> Maybe.withDefault (String.length rest))
        in
        ( String.slice start stop m.workspace, stop )


save : Model -> ( Model, Cmd Msg )
save m =
    ( m, store (Just (St.encodeImage m.workspace m.machine)) )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        Edit s ->
            save { m | workspace = s }

        Selected s ->
            ( { m | sel = s }, Cmd.none )

        Shortcut k s ->
            update
                (if k == "p" then
                    PrintIt

                 else
                    DoIt
                )
                { m | sel = s }

        DoIt ->
            let
                ( src, _ ) =
                    target m

                ( r, mach ) =
                    St.doIt src m.machine
            in
            save { m | machine = mach, status = resultText r (always "Done.") }

        PrintIt ->
            let
                ( src, at ) =
                    target m

                ( r, mach ) =
                    St.printIt src m.machine
            in
            case r of
                Ok s ->
                    save { m | machine = mach, workspace = String.left at m.workspace ++ " " ++ s ++ String.dropLeft at m.workspace, status = "Printed." }

                Err e ->
                    save { m | machine = mach, status = e }

        PickClass c ->
            ( { m | cls = Just c, method = Nothing, code = St.classDefinition m.machine c, status = "Edit the definition and accept, or pick a method." }, Cmd.none )

        PickMethod s ->
            ( { m | method = Just s, code = Maybe.map (\c -> St.methodSource m.machine c s) m.cls |> Maybe.withDefault "" }, Cmd.none )

        NewMethod ->
            ( { m | method = Nothing, code = "messageSelector: argument\n    \"comment stating purpose of message\"\n    ^argument", status = "Write the method, then accept." }, Cmd.none )

        NewClass ->
            ( { m | cls = Nothing, method = Nothing, code = St.classDefinition m.machine "", status = "Name the class, then accept." }, Cmd.none )

        Code s ->
            ( { m | code = s }, Cmd.none )

        Accept ->
            accept m

        ClearTranscript ->
            let
                mach =
                    m.machine
            in
            save { m | machine = { mach | transcript = "" } }

        Reset ->
            if m.confirmReset then
                ( { m | machine = St.boot, workspace = welcome, cls = Nothing, method = Nothing, code = "", confirmReset = False, status = "A fresh image." }, store Nothing )

            else
                ( { m | confirmReset = True, status = "Press Reset again to throw this image away." }, Cmd.none )

        World ->
            ( { m | world = not m.world }, Cmd.none )

        Go url ->
            ( m, Nav.load url )


{-| A class definition is code to run; anything else is a method of the
selected class.
-}
accept : Model -> ( Model, Cmd Msg )
accept m =
    case ( m.cls, m.method /= Nothing || not (String.contains "subclass:" m.code) ) of
        ( Just c, True ) ->
            case St.compile c m.code m.machine of
                Ok ( sel, mach ) ->
                    save { m | machine = mach, method = Just sel, status = "Accepted " ++ c ++ ">>" ++ sel ++ "." }

                Err e ->
                    ( { m | status = e }, Cmd.none )

        _ ->
            let
                ( r, mach ) =
                    St.doIt m.code m.machine
            in
            case r of
                Ok (St.VClass c) ->
                    save { m | machine = mach, cls = Just c, method = Nothing, status = "Defined " ++ c ++ "." }

                Ok _ ->
                    save { m | machine = mach, status = "Done." }

                Err e ->
                    ( { m | status = e }, Cmd.none )


resultText : Result String a -> (a -> String) -> String
resultText r f =
    case r of
        Ok v ->
            f v

        Err e ->
            e



-- VIEW


selection : D.Decoder ( Int, Int )
selection =
    D.map2 Tuple.pair (D.at [ "target", "selectionStart" ] D.int) (D.at [ "target", "selectionEnd" ] D.int)


{-| Ctrl+D and Ctrl+P (Cmd on a Mac) run code instead of their browser actions.
-}
shortcuts : D.Decoder ( Msg, Bool )
shortcuts =
    D.map3 (\k ctrl s -> ( k, ctrl, s ))
        (D.field "key" D.string)
        (D.map2 (||) (D.field "ctrlKey" D.bool) (D.field "metaKey" D.bool))
        selection
        |> D.andThen
            (\( k, ctrl, s ) ->
                if ctrl && (k == "d" || k == "p") then
                    D.succeed ( Shortcut k s, True )

                else
                    D.fail "not a shortcut"
            )


acceptKey : D.Decoder ( Msg, Bool )
acceptKey =
    D.map2 Tuple.pair (D.field "key" D.string) (D.map2 (||) (D.field "ctrlKey" D.bool) (D.field "metaKey" D.bool))
        |> D.andThen
            (\( k, ctrl ) ->
                if ctrl && k == "s" then
                    D.succeed ( Accept, True )

                else
                    D.fail "not accept"
            )


window : String -> String -> List (Html Msg) -> Html Msg
window cls title_ body =
    section [ class ("st-win " ++ cls) ]
        [ header [ class "st-tab" ] [ text title_ ]
        , div [ class "st-body" ] body
        ]


view : Model -> Html Msg
view m =
    let
        go =
            Common.site m.flags

        builtins =
            [ "Object", "Integer", "Number", "String", "Array", "BlockClosure", "Boolean" ]

        classes =
            St.userClasses m.machine

        classItem c =
            li [ classList [ ( "on", m.cls == Just c ) ], onClick (PickClass c) ] [ text c ]
    in
    div [ class "st" ]
        [ nav [ class "st-bar" ]
            [ span [ class "st-logo" ] [ text "Smalltalk-80" ]
            , button [ onClick ClearTranscript ] [ text "Clear transcript" ]
            , button [ onClick Reset, classList [ ( "warn", m.confirmReset ) ] ] [ text "Reset image" ]
            , span [ class "st-grow" ] []
            , div [ class "st-world" ]
                [ button [ onClick World ] [ text "World ▾" ]
                , if m.world then
                    ul [ class "st-worldmenu" ] (List.map (\pl -> li [] [ a [ href (go pl.name) ] [ text (pl.title ++ " "), span [] [ text pl.blurb ] ] ]) (Common.placesBut "smalltalk"))

                  else
                    text ""
                ]
            , a [ href Common.fundUrl ] [ text "♥ sponsor" ]
            ]
        , div [ class "st-desk" ]
            [ window "st-work"
                "Workspace"
                [ textarea
                    [ value m.workspace
                    , onInput Edit
                    , spellcheck False
                    , on "select" (D.map Selected selection)
                    , on "keyup" (D.map Selected selection)
                    , on "mouseup" (D.map Selected selection)
                    , preventDefaultOn "keydown" shortcuts
                    , attribute "aria-label" "Workspace"
                    ]
                    []
                , div [ class "st-buttons" ]
                    [ button [ onClick DoIt ] [ text "do it (Ctrl+D)" ]
                    , button [ onClick PrintIt ] [ text "print it (Ctrl+P)" ]
                    ]
                ]
            , window "st-trans" "Transcript" [ pre [] [ text m.machine.transcript ] ]
            , window "st-browser"
                "System Browser"
                [ div [ class "st-panes" ]
                    [ ul [ class "st-pane" ]
                        (List.map classItem classes
                            ++ li [ class "st-sep" ] [ text "built in" ]
                            :: List.map classItem (List.filter (\c -> not (List.member c classes)) builtins)
                        )
                    , ul [ class "st-pane" ]
                        (case m.cls of
                            Just c ->
                                List.map (\s -> li [ classList [ ( "on", m.method == Just s ) ], onClick (PickMethod s) ] [ text s ]) (St.selectors m.machine c)

                            Nothing ->
                                []
                        )
                    ]
                , textarea [ class "st-code", value m.code, onInput Code, spellcheck False, preventDefaultOn "keydown" acceptKey, attribute "aria-label" "Code" ] []
                , div [ class "st-buttons" ]
                    [ button [ onClick Accept ] [ text "accept (Ctrl+S)" ]
                    , button [ onClick NewMethod, disabled (m.cls == Nothing) ] [ text "new method" ]
                    , button [ onClick NewClass ] [ text "new class" ]
                    ]
                ]
            ]
        , footer [ class "st-status" ] [ text m.status ]
        ]
