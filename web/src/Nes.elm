port module Nes exposing (main)

{-| nes.oeiuwq.com: NEON VIGIL on an 8-bit console. Arrows run, Z or Space
jumps, X lashes, Enter is START. Touch buttons do the same on a phone.
EDIT STAGE opens the stage file; Run plays the edited stage, and the edit
is kept in this browser.
-}

import Browser
import Browser.Events
import Common exposing (Flags)
import Dict
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (on, onClick)
import Json.Decode as D
import Set exposing (Set)
import Svg
import Svg.Attributes as SA
import Vigil


port store : Maybe String -> Cmd msg


type Screen
    = Title
    | Game


type alias Model =
    { flags : Flags
    , screen : Screen
    , stage : Vigil.Stage
    , source : String
    , game : Vigil.Game
    , held : Set String
    , editing : Bool
    , draft : String
    , error : Maybe String
    }


type Msg
    = Frame Float
    | Down String
    | Up String
    | Start
    | Edit Bool
    | Draft String
    | RunDraft
    | ResetDraft


main : Program D.Value Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , view = view
        , subscriptions =
            \m ->
                if m.editing then
                    Sub.none

                else
                    Sub.batch
                        [ Browser.Events.onKeyDown (D.map Down (D.field "key" D.string))
                        , Browser.Events.onKeyUp (D.map Up (D.field "key" D.string))
                        , if m.screen == Game && m.game.phase == Vigil.Playing then
                            Browser.Events.onAnimationFrameDelta Frame

                          else
                            Sub.none
                        ]
        }


fallback : Vigil.Stage
fallback =
    Vigil.parse Vigil.defaultSource |> Result.withDefault { pages = [], ending = "", map = [] }


init : D.Value -> ( Model, Cmd Msg )
init v =
    let
        flags =
            D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }

        stored =
            D.decodeValue (D.field "stored" (D.nullable D.string)) v |> Result.toMaybe |> Maybe.andThen identity

        ( source, stage ) =
            case stored |> Maybe.andThen (\src -> Vigil.parse src |> Result.toMaybe |> Maybe.map (Tuple.pair src)) of
                Just pair ->
                    pair

                Nothing ->
                    ( Vigil.defaultSource, fallback )
    in
    ( { flags = flags, screen = Title, stage = stage, source = source, game = Vigil.new stage, held = Set.empty, editing = False, draft = source, error = Nothing }
    , Cmd.none
    )


input : Set String -> Vigil.Input
input held =
    let
        any keys =
            List.any (\k -> Set.member k held) keys
    in
    { left = any [ "ArrowLeft", "a", "A" ]
    , right = any [ "ArrowRight", "d", "D" ]
    , jump = any [ "z", "Z", " ", "ArrowUp", "w", "W" ]
    , lash = any [ "x", "X", "j", "J" ]
    }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        Frame ms ->
            ( { m | game = Vigil.step ms (input m.held) m.game }, Cmd.none )

        Down "Enter" ->
            update Start m

        Down k ->
            ( { m | held = Set.insert k m.held }, Cmd.none )

        Up k ->
            ( { m | held = Set.remove k m.held }, Cmd.none )

        Start ->
            case ( m.screen, m.game.phase ) of
                ( Title, _ ) ->
                    ( { m | screen = Game }, Cmd.none )

                ( Game, Vigil.Story _ ) ->
                    ( { m | game = Vigil.start m.game }, Cmd.none )

                ( Game, Vigil.Won ) ->
                    ( { m | screen = Title, game = Vigil.new m.stage }, Cmd.none )

                _ ->
                    ( m, Cmd.none )

        Edit open ->
            ( { m | editing = open, draft = m.source, error = Nothing, held = Set.empty }, Cmd.none )

        Draft s ->
            ( { m | draft = s }, Cmd.none )

        ResetDraft ->
            ( { m | draft = Vigil.defaultSource, error = Nothing }, Cmd.none )

        RunDraft ->
            case Vigil.parse m.draft of
                Ok stage ->
                    ( { m | stage = stage, source = m.draft, game = Vigil.new stage, screen = Game, editing = False, error = Nothing }
                    , store
                        (if m.draft == Vigil.defaultSource then
                            Nothing

                         else
                            Just m.draft
                        )
                    )

                Err e ->
                    ( { m | error = Just e }, Cmd.none )


view : Model -> Html Msg
view m =
    div [ class "nes" ]
        [ div [ class "tv" ]
            [ div [ class "screen" ]
                [ case ( m.screen, m.game.phase ) of
                    ( Title, _ ) ->
                        div [ class "card title" ]
                            [ h1 [] [ text "NEON VIGIL" ]
                            , p [ class "sub" ] [ text "A NIGHT IN THE ARCOLOGY" ]
                            , p [ class "blink" ] [ text "PRESS START" ]
                            , p [ class "small" ] [ text "© 2026 OEIUWQ · LICENSED BY NOBODY" ]
                            ]

                    ( Game, Vigil.Story n ) ->
                        div [ class "card story" ]
                            [ p [] [ text (List.drop n m.game.pages |> List.head |> Maybe.withDefault "") ]
                            , p [ class "blink" ] [ text "▶ START" ]
                            ]

                    ( Game, Vigil.Won ) ->
                        div [ class "card story" ]
                            [ h2 [] [ text "THE VAULT IS OPEN" ]
                            , p [] [ text (m.game.ending ++ " SCORE " ++ String.fromInt m.game.score) ]
                            , p [] [ text "Like the code in this story, everything I make is free. If this little game made you smile, you can keep the night shift going:" ]
                            , div [ class "buttons" ]
                                [ a [ href Common.fundUrl ] [ text "♥ SPONSOR" ]
                                , a [ href Common.kofiUrl ] [ text "☕ KO-FI" ]
                                , button [ onClick Start ] [ text "↺ AGAIN" ]
                                , button [ onClick (Edit True) ] [ text "✎ EDIT STAGE" ]
                                ]
                            ]

                    ( Game, Vigil.Playing ) ->
                        Svg.svg [ SA.viewBox "0 0 256 240", SA.class "field", SA.preserveAspectRatio "xMidYMid meet" ] [ Vigil.view m.game ]
                ]
            ]
        , div [ class "console" ]
            [ div [ class "pad" ] [ hold "◀" "ArrowLeft", hold "▶" "ArrowRight" ]
            , div [ class "mid" ]
                [ button [ class "pill", onClick Start ] [ text "START" ]
                , button [ class "pill", onClick (Edit True) ] [ text "EDIT" ]
                , a [ class "pill", href (Common.site m.flags "home") ] [ text "HOME" ]
                ]
            , div [ class "ab" ] [ hold "B" "x", hold "A" "z" ]
            ]
        , p [ class "help" ] [ text "← → run · Z jump · X lash · Enter start · EDIT changes the stage" ]
        , h3 [ class "shelf-title" ] [ text "MORE CARTRIDGES" ]
        , div [ class "shelf" ]
            (List.map
                (\pl ->
                    a [ class "cart", href (Common.site m.flags pl.name), title pl.blurb ]
                        [ span [ class "cart-label" ] [ span [ class "cart-glyph" ] [ text pl.glyph ], strong [] [ text (String.toUpper pl.title) ], small [] [ text pl.blurb ] ] ]
                )
                (Common.placesBut "nes")
            )
        , if m.editing then
            Common.editor
                { title = "Stage file: NEON VIGIL"
                , help = "story and ending lines are the text pages. Under map: # wall, = ledge, d drone, b bot, c checkpoint, h energy, G gate. Run plays your stage."
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


{-| A touch button that holds a key while pressed.
-}
hold : String -> String -> Html Msg
hold label key =
    button
        [ class ("key key-" ++ String.toLower label)
        , on "pointerdown" (D.succeed (Down key))
        , on "pointerup" (D.succeed (Up key))
        , on "pointerleave" (D.succeed (Up key))
        , attribute "aria-label" key
        ]
        [ text label ]
