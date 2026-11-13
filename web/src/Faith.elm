module Faith exposing (main)

{-| faith.oeiuwq.com: a HyperCard stack. The first card is the title card;
the other cards are the files of content/faith. Arrow keys flip cards.
-}

import Browser
import Common exposing (Flags)
import Dict
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick)
import Http
import Json.Decode as D
import Markdown


type alias Card =
    { title : String, body : String }


type alias Model =
    { flags : Flags
    , cards : List Card
    , at : Int
    , home : Bool
    }


type Msg
    = GotCards (Result Http.Error (List Card))
    | Go Int
    | Key String
    | Home


main : Program D.Value Model Msg
main =
    Browser.element { init = init, update = update, view = view, subscriptions = \_ -> Common.onKey Key }


init : D.Value -> ( Model, Cmd Msg )
init v =
    ( { flags = D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }
      , cards = []
      , at = 0
      , home = False
      }
    , Common.getJson "/api/cards" (D.list (D.map2 Card (D.field "title" D.string) (D.field "body" D.string))) GotCards
    )


{-| The stack: a title card, then the content cards.
-}
stack : Model -> List Card
stack m =
    Card "Faith" "*vic's stack*\n\nClick ▶ or press → to turn the card." :: m.cards


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    let
        n =
            List.length (stack m)
    in
    case msg of
        GotCards r ->
            ( { m | cards = Result.withDefault [] r }, Cmd.none )

        Home ->
            ( { m | home = not m.home }, Cmd.none )

        Go i ->
            ( { m | at = modBy n i }, Cmd.none )

        Key "ArrowRight" ->
            ( { m | at = modBy n (m.at + 1) }, Cmd.none )

        Key "ArrowLeft" ->
            ( { m | at = modBy n (m.at - 1) }, Cmd.none )

        Key _ ->
            ( m, Cmd.none )


view : Model -> Html Msg
view m =
    let
        cards =
            stack m

        card =
            List.drop m.at cards |> List.head |> Maybe.withDefault (Card "" "")
    in
    div [ class "hc" ]
        [ nav [ class "hc-menu" ]
            [ span [ class "hc-apple" ] [ text "◆" ]
            , span [] [ text "File" ]
            , span [] [ text "Edit" ]
            , button [ class "hc-menubtn", onClick Home ] [ text "Go: Home stack" ]
            , a [ href (Common.site m.flags "home") ] [ text "Home" ]
            , a [ href (Common.site m.flags "love") ] [ text "Love" ]
            , a [ href Common.fundUrl ] [ text "Sponsor" ]
            ]
        , div [ class "hc-window" ]
            [ header [ class "hc-title" ]
                [ h2 []
                    [ text
                        (if m.home then
                            "Home"

                         else
                            "Faith"
                        )
                    ]
                ]
            , if m.home then
                homeCard m

              else
                article [ class "hc-card", classList [ ( "first", m.at == 0 ) ] ]
                    [ h1 [] [ text card.title ]
                    , Markdown.toHtml [ class "hc-field" ] (Common.siteLinks m.flags card.body)
                    , div [ class "hc-nav" ]
                        [ button [ onClick (Go (m.at - 1)), attribute "aria-label" "Previous card" ] [ text "◀" ]
                        , span [ class "hc-count" ] [ text (String.fromInt (m.at + 1) ++ " / " ++ String.fromInt (List.length cards)) ]
                        , button [ class "hc-home", onClick Home, title "Home stack" ] [ text "⌂" ]
                        , button [ onClick (Go (m.at + 1)), attribute "aria-label" "Next card" ] [ text "▶" ]
                        ]
                    ]
            ]
        ]


{-| HyperCard's Home card: one stack icon for each corner of oeiuwq.com.
-}
homeCard : Model -> Html Msg
homeCard m =
    article [ class "hc-card hc-homecard" ]
        [ h1 [] [ text "Home" ]
        , div [ class "hc-stacks" ]
            (List.map
                (\pl ->
                    a [ class "hc-stack", href (Common.site m.flags pl.name), title pl.blurb ]
                        [ span [ class "hc-stackicon" ] [ text pl.glyph ], span [] [ text pl.title ] ]
                )
                (Common.placesBut "faith")
            )
        , div [ class "hc-nav" ] [ button [ class "hc-home", onClick Home, title "Back to the Faith stack" ] [ text "⌂" ] ]
        ]
