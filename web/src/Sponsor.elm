port module Sponsor exposing (main)

{-| sponsor.oeiuwq.com: an arcade cabinet in attract mode. It cycles a title
screen, the public sponsors and the projects that funds keep alive. INSERT
COIN (Enter or a click) starts BUG HUNT, a game nobody loses; the win
screen offers GitHub Sponsors or Ko-fi.
-}

import Browser
import Browser.Events
import Browser.Navigation as Nav
import Common exposing (Flags, Repo)
import Dict
import Game
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (on, onClick, onMouseEnter)
import Http
import Json.Decode as D
import Svg
import Svg.Attributes as SA
import Time


port store : Maybe String -> Cmd msg


type Screen
    = Title
    | Scores
    | Stages
    | Play Game.Game
    | Won Int


type alias Sponsor =
    { login : String, name : String, avatarUrl : String }


type alias Model =
    { flags : Flags
    , screen : Screen
    , sponsors : List Sponsor
    , repos : List Repo
    , player : Int
    , rules : Game.Rules
    , source : String
    , editing : Bool
    , draft : String
    , error : Maybe String
    }


type Msg
    = Tick
    | Coin
    | Pick Int
    | Key String
    | Frame Float
    | Steer Float
    | GotSponsors (Result Http.Error (List Sponsor))
    | GotRepos (Result Http.Error (List Repo))
    | Edit Bool
    | Draft String
    | RunDraft
    | ResetDraft


players : List ( String, String, String )
players =
    [ ( "1P", "GitHub Sponsors", Common.fundUrl ), ( "2P", "Ko-fi", Common.kofiUrl ) ]


main : Program D.Value Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , view = view
        , subscriptions =
            \m ->
                Sub.batch
                    [ Common.onKey Key
                    , case m.screen of
                        Play _ ->
                            Browser.Events.onAnimationFrameDelta Frame

                        Won _ ->
                            Sub.none

                        _ ->
                            Time.every 5000 (\_ -> Tick)
                    ]
        }


init : D.Value -> ( Model, Cmd Msg )
init v =
    let
        ( source, rules ) =
            D.decodeValue (D.field "stored" (D.nullable D.string)) v
                |> Result.toMaybe
                |> Maybe.andThen identity
                |> Maybe.andThen (\src -> Game.parse src |> Result.toMaybe |> Maybe.map (Tuple.pair src))
                |> Maybe.withDefault ( Game.defaultSource, Game.defaultRules )
    in
    ( { flags = D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }
      , screen = Title
      , sponsors = []
      , repos = []
      , player = 0
      , rules = rules
      , source = source
      , editing = False
      , draft = source
      , error = Nothing
      }
    , Cmd.batch
        [ Common.getJson "/api/sponsors" (D.list (D.map3 Sponsor (D.field "login" D.string) (D.field "name" D.string) (D.field "avatarUrl" D.string))) GotSponsors
        , Common.getJson "/api/repos" (D.list Common.repoDecoder) GotRepos
        ]
    )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        Tick ->
            ( { m
                | screen =
                    case m.screen of
                        Title ->
                            Scores

                        Scores ->
                            Stages

                        _ ->
                            Title
              }
            , Cmd.none
            )

        Coin ->
            ( { m | screen = Play (Game.new m.rules (List.length m.sponsors * 7919 + 17)) }, Cmd.none )

        Frame ms ->
            case m.screen of
                Play g ->
                    let
                        g2 =
                            Game.step ms g
                    in
                    ( { m
                        | screen =
                            if Game.won g2 then
                                Won g2.score

                            else
                                Play g2
                      }
                    , Cmd.none
                    )

                _ ->
                    ( m, Cmd.none )

        Steer x ->
            case m.screen of
                Play g ->
                    ( { m | screen = Play (Game.moveTo x g) }, Cmd.none )

                _ ->
                    ( m, Cmd.none )

        Pick i ->
            ( { m | player = i }, Cmd.none )

        GotSponsors r ->
            ( { m | sponsors = Result.withDefault [] r }, Cmd.none )

        Edit open ->
            ( { m | editing = open, draft = m.source, error = Nothing }, Cmd.none )

        Draft s ->
            ( { m | draft = s }, Cmd.none )

        ResetDraft ->
            ( { m | draft = Game.defaultSource, error = Nothing }, Cmd.none )

        RunDraft ->
            case Game.parse m.draft of
                Ok rules ->
                    ( { m | rules = rules, source = m.draft, editing = False, error = Nothing, screen = Play (Game.new rules 17) }
                    , store
                        (if m.draft == Game.defaultSource then
                            Nothing

                         else
                            Just m.draft
                        )
                    )

                Err e ->
                    ( { m | error = Just e }, Cmd.none )

        GotRepos r ->
            ( { m | repos = Result.withDefault [] r }, Cmd.none )

        Key k ->
            case ( m.screen, k ) of
                ( Play g, "ArrowLeft" ) ->
                    ( { m | screen = Play (Game.nudge -8 g) }, Cmd.none )

                ( Play g, "ArrowRight" ) ->
                    ( { m | screen = Play (Game.nudge 8 g) }, Cmd.none )

                ( Play _, _ ) ->
                    ( m, Cmd.none )

                ( Won _, "ArrowDown" ) ->
                    ( { m | player = modBy 2 (m.player + 1) }, Cmd.none )

                ( Won _, "ArrowUp" ) ->
                    ( { m | player = modBy 2 (m.player - 1) }, Cmd.none )

                ( Won _, "Enter" ) ->
                    ( m, players |> List.drop m.player |> List.head |> Maybe.map (\( _, _, u ) -> Nav.load u) |> Maybe.withDefault Cmd.none )

                ( Won _, "Escape" ) ->
                    ( { m | screen = Title }, Cmd.none )

                ( _, "Enter" ) ->
                    update Coin m

                _ ->
                    ( m, Cmd.none )


{-| Own projects pushed in the most recent year with pushes, most starred first.
-}
stages : Model -> List Repo
stages m =
    let
        own =
            List.filter (not << .fork) m.repos

        latest =
            List.map (.pushedAt >> Common.yearOf) own |> List.maximum |> Maybe.withDefault 0
    in
    own
        |> List.filter (\r -> Common.yearOf r.pushedAt == latest)
        |> List.sortBy (.stars >> negate)
        |> List.take 8


view : Model -> Html Msg
view m =
    div [ class "cabinet" ]
        [ header [ class "marquee" ] [ h1 [] [ text "oeiuwq" ], span [] [ text "ARCADE" ] ]
        , if m.editing then
            Common.editor
                { title = "BUG HUNT rules"
                , help = "Change the goal, the time, how fast bugs fall, how often they come, and their names. Run starts a game with your rules."
                , source = m.draft
                , error = m.error
                , onInput = Draft
                , onRun = RunDraft
                , onReset = ResetDraft
                , onClose = Edit False
                }

          else
            text ""
        , div [ class "bezel" ]
            [ div [ class "screen" ]
                [ case m.screen of
                    Title ->
                        div [ class "title" ]
                            [ h2 [] [ text "FUND THE FUN" ]
                            , p [ class "sub" ] [ text "compilers · effects · nix · games" ]
                            , p [ class "credit" ] [ text "OPEN SOURCE SINCE 1999" ]
                            , button [ class "coin", onClick Coin ] [ text "INSERT COIN" ]
                            ]

                    Scores ->
                        div [ class "scores" ]
                            [ h2 [] [ text "HIGH SCORES" ]
                            , if List.isEmpty m.sponsors then
                                p [] [ text "YOUR NAME HERE" ]

                              else
                                ol []
                                    (List.indexedMap
                                        (\i s ->
                                            li []
                                                [ span [ class "rank" ] [ text (rank (i + 1)) ]
                                                , img [ src s.avatarUrl, alt "", attribute "loading" "lazy" ] []
                                                , a [ href ("https://github.com/" ++ s.login) ] [ text (String.toUpper s.login) ]
                                                , span [ class "pts" ] [ text "♥ THANK YOU" ]
                                                ]
                                        )
                                        m.sponsors
                                    )
                            , button [ class "coin small", onClick Coin ] [ text "INSERT COIN" ]
                            ]

                    Stages ->
                        div [ class "stages" ]
                            [ h2 [] [ text "STAGES IN PLAY" ]
                            , ul [] (List.indexedMap (\i r -> li [] [ span [ class "rank" ] [ text ("STAGE " ++ String.fromInt (i + 1)) ], a [ href r.url ] [ text (String.toUpper r.name) ], span [ class "pts" ] [ text ("★" ++ String.fromInt r.stars) ] ]) (stages m))
                            , button [ class "coin small", onClick Coin ] [ text "INSERT COIN" ]
                            ]

                    Play g ->
                        div [ class "play" ]
                            [ Svg.svg
                                [ SA.viewBox "0 0 100 75"
                                , SA.class "field"
                                , on "pointermove" (D.map2 (\x w -> Steer (100 * x / Basics.max 1 w)) (D.field "offsetX" D.float) (D.at [ "currentTarget", "clientWidth" ] D.float))
                                , on "pointerdown" (D.map2 (\x w -> Steer (100 * x / Basics.max 1 w)) (D.field "offsetX" D.float) (D.at [ "currentTarget", "clientWidth" ] D.float))
                                ]
                                [ Game.view g ]
                            , p [ class "sub" ] [ text "← → or the mouse steer · the ship fires by itself" ]
                            ]

                    Won score ->
                        div [ class "select" ]
                            [ h2 [] [ text "YOU WIN!" ]
                            , p [ class "credit" ] [ text ("BUGS FIXED " ++ String.fromInt score ++ " · YOU ARE A HERO") ]
                            , p [ class "sub" ] [ text "Help me fix the real ones. CONTINUE?" ]
                            , ul []
                                (List.indexedMap
                                    (\i ( p_, name, url ) ->
                                        li [ classList [ ( "sel", i == m.player ) ], onMouseEnter (Pick i) ]
                                            [ a [ href url ] [ span [ class "rank" ] [ text p_ ], text (String.toUpper name) ] ]
                                    )
                                    players
                                )
                            , p [ class "sub" ] [ text "↑ ↓ choose · ENTER sponsor · ESC title" ]
                            ]
                ]
            ]
        , div [ class "panel" ]
            [ div [ class "stick" ] []
            , button [ class "edit", onClick (Edit True) ] [ text "EDIT RULES" ]
            , button [ class "btn-a", onClick Coin, attribute "aria-label" "Insert coin" ] []
            , button [ class "btn-b", onClick (Key "Escape"), attribute "aria-label" "Back" ] []
            , a [ class "slot", href (Common.site m.flags "home") ] [ text "◀ HOME" ]
            ]
        , h3 [ class "row-title" ] [ text "MORE CABINETS ON THIS FLOOR" ]
        , div [ class "row" ] (List.map (\pl -> a [ class "minicab", href (Common.site m.flags pl.name), title pl.blurb ] [ span [ class "mc-marquee" ] [ text (String.toUpper pl.title) ], span [ class "mc-screen" ] [ text pl.glyph ], span [ class "mc-blurb" ] [ text pl.blurb ] ]) (Common.placesBut "sponsor"))
        ]


rank : Int -> String
rank n =
    String.fromInt n
        ++ (case n of
                1 ->
                    "ST"

                2 ->
                    "ND"

                3 ->
                    "RD"

                _ ->
                    "TH"
           )
