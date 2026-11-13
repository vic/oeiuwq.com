module Love exposing (main)

{-| love.oeiuwq.com: MS-DOS EDIT with LOVE.TXT open. File > Save sends the
letter to vic, the same way the old love.oeiuwq.com did.
-}

import Browser
import Browser.Navigation as Nav
import Common exposing (Flags)
import Dict
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick, onInput, stopPropagationOn)
import Http
import Json.Decode as D
import Json.Encode as E


type Dialog
    = Sending
    | Sent
    | Failed String
    | AboutBox
    | OpenBox


type alias Model =
    { flags : Flags
    , letter : String
    , menu : Maybe String
    , dialog : Maybe Dialog
    }


type Msg
    = Edit String
    | Menu String
    | CloseMenu
    | New
    | Save
    | GotSave (Result Http.Error ())
    | Exit
    | Show Dialog
    | Dismiss
    | Key String


first : String
first =
    "Hello, This is a love letter.\n\nYours truly, vic."


main : Program D.Value Model Msg
main =
    Browser.element { init = init, update = update, view = view, subscriptions = \_ -> Common.onKey Key }


init : D.Value -> ( Model, Cmd Msg )
init v =
    ( { flags = D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }
      , letter = first
      , menu = Nothing
      , dialog = Nothing
      }
    , Cmd.none
    )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        Edit s ->
            ( { m | letter = s }, Cmd.none )

        Menu name ->
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

        New ->
            ( { m | letter = "", menu = Nothing }, Cmd.none )

        Save ->
            ( { m | dialog = Just Sending, menu = Nothing }
            , Http.post
                { url = "/api/love"
                , body = Http.jsonBody (E.object [ ( "love", E.string m.letter ) ])
                , expect = Http.expectWhatever GotSave
                }
            )

        GotSave (Ok ()) ->
            ( { m | dialog = Just Sent }, Cmd.none )

        GotSave (Err _) ->
            ( { m | dialog = Just (Failed "The letter could not be sent. Try again later.") }, Cmd.none )

        Exit ->
            ( m, Nav.load (Common.site m.flags "home") )

        Show d ->
            ( { m | dialog = Just d, menu = Nothing }, Cmd.none )

        Dismiss ->
            ( { m | dialog = Nothing }, Cmd.none )

        Key "F10" ->
            ( { m | menu = Just "File" }, Cmd.none )

        Key "F2" ->
            update Save m

        Key "Escape" ->
            ( { m | menu = Nothing, dialog = Nothing }, Cmd.none )

        Key _ ->
            ( m, Cmd.none )


stop : msg -> Attribute msg
stop msg =
    stopPropagationOn "click" (D.succeed ( msg, True ))


view : Model -> Html Msg
view m =
    let
        menu name hot items =
            div [ class "dm" ]
                [ button [ classList [ ( "dm-title", True ), ( "open", m.menu == Just name ) ], stop (Menu name) ]
                    [ span [ class "hot" ] [ text hot ], text (String.dropLeft 1 name) ]
                , if m.menu == Just name then
                    div [ class "dm-drop" ] items

                  else
                    text ""
                ]

        item hot rest key msg =
            button [ class "dm-item", stop msg ] [ span [] [ span [ class "hot" ] [ text hot ], text rest ], span [ class "key" ] [ text key ] ]

        lines =
            List.length (String.lines m.letter)
    in
    div [ class "dos", onClick CloseMenu ]
        [ nav [ class "bar" ]
            [ menu "File"
                "F"
                [ item "N" "ew" "" New
                , item "O" "pen..." "Ctrl+O" (Show OpenBox)
                , item "S" "ave (send to vic)" "F2" Save
                , div [ class "sep" ] []
                , item "E" "xit" "" Exit
                ]
            , menu "Options" "O" [ a [ class "dm-item", href (Common.site m.flags "home") ] [ span [] [ span [ class "hot" ] [ text "C" ], text "olors… (SETUP, DEL)" ] ] ]
            , menu "Help" "H" [ item "A" "bout" "" (Show AboutBox) ]
            ]
        , main_ [ class "edit-area" ]
            [ div [ class "frame" ]
                [ span [ class "fname" ] [ text " LOVE.TXT " ]
                , textarea [ value m.letter, onInput Edit, spellcheck False, attribute "aria-label" "Love letter" ] []
                ]
            ]
        , footer [ class "status" ]
            [ span [] [ text "F10=Menu  F2=Save  File>Open: other places  Esc=Cancel" ]
            , span [ class "pos" ] [ text ("Lines:" ++ String.fromInt lines ++ "  Chars:" ++ String.fromInt (String.length m.letter)) ]
            ]
        , case m.dialog of
            Nothing ->
                text ""

            Just d ->
                div [ class "dialog-back" ]
                    [ div [ class "dialog" ]
                        [ h2 []
                            [ text
                                (if d == OpenBox then
                                    " Open File "

                                 else
                                    " LOVE.TXT "
                                )
                            ]
                        , p []
                            [ text
                                (case d of
                                    Sending ->
                                        "Sending your letter…"

                                    Sent ->
                                        "Saved. Your letter is on its way. Thank you."

                                    Failed e ->
                                        e

                                    OpenBox ->
                                        "Open another file of oeiuwq.com:"

                                    AboutBox ->
                                        "Love is learning from God to love the people in the world. Write a letter here; File > Save sends it to vic."
                                )
                            ]
                        , if d == OpenBox then
                            ul [ class "files" ] (List.map (\pl -> li [] [ a [ href (Common.site m.flags pl.name) ] [ span [ class "fn" ] [ text (String.toUpper (String.left 8 pl.name) ++ ".TXT") ], text pl.blurb ] ]) (Common.placesBut "love"))

                          else
                            text ""
                        , if d == Sending then
                            text ""

                          else
                            button [ class "ok", onClick Dismiss ] [ text "<  OK  >" ]
                        ]
                    ]
        ]
