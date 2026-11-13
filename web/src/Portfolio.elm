module Portfolio exposing (main)

{-| portfolio.oeiuwq.com: a NeXTSTEP workspace with the CV, an Inspector and
the projects with the most stars.
-}

import Browser
import Common exposing (Flags, Repo)
import Dict
import Html exposing (..)
import Html.Attributes exposing (..)
import Http
import Json.Decode as D
import Markdown


type alias Model =
    { flags : Flags
    , cv : Maybe String
    , repos : List Repo
    }


type Msg
    = GotCv (Result Http.Error String)
    | GotRepos (Result Http.Error (List Repo))


main : Program D.Value Model Msg
main =
    Browser.element { init = init, update = update, view = view, subscriptions = \_ -> Sub.none }


init : D.Value -> ( Model, Cmd Msg )
init v =
    ( { flags = D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }
      , cv = Nothing
      , repos = []
      }
    , Cmd.batch
        [ Http.get { url = "/api/cv", expect = Http.expectString GotCv }
        , Common.getJson "/api/repos" (D.list Common.repoDecoder) GotRepos
        ]
    )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        GotCv r ->
            ( { m | cv = Result.toMaybe r }, Cmd.none )

        GotRepos r ->
            ( { m | repos = Result.withDefault [] r }, Cmd.none )


window : String -> String -> List (Html msg) -> Html msg
window id_ title body =
    section [ class "nx-window", id id_ ]
        [ header [ class "nx-title" ] [ span [ class "nx-mini" ] [], h2 [] [ text title ], span [ class "nx-x" ] [ text "×" ] ]
        , div [ class "nx-body" ] body
        ]


view : Model -> Html Msg
view m =
    let
        go =
            Common.site m.flags

        menuItem label url key =
            a [ class "nx-item", href url ] [ span [] [ text label ], kbd [] [ text key ] ]

        tile glyph label url =
            a [ class "nx-tile", href url, title label ] [ span [ class "nx-glyph" ] [ text glyph ], span [ class "nx-tlabel" ] [ text label ] ]

        top =
            m.repos
                |> List.filter (not << .fork)
                |> List.sortBy (.stars >> negate)
                |> List.take 16

        denful =
            m.repos |> List.filter (\r -> r.owner == "denful") |> List.map .stars |> List.sum
    in
    div [ class "nx" ]
        [ nav [ class "nx-menu" ]
            [ div [ class "nx-mtitle" ] [ text "Portfolio" ]
            , menuItem "Info…" "#inspector" "i"
            , menuItem "CV" "#cv" "c"
            , menuItem "Projects" "#projects" "p"
            , menuItem "Codes" (go "codes") "o"
            , menuItem "Sponsor" Common.fundUrl "$"
            , menuItem "Home" (go "home") "h"
            ]
        , aside [ class "nx-dock" ]
            (List.map (\pl -> tile pl.glyph pl.title (go pl.name)) (Common.placesBut "portfolio") ++ [ tile "@" "Email" "mailto:vborja@apache.org" ])
        , main_ [ class "nx-desk" ]
            [ window "inspector"
                "Inspector"
                [ img [ src "/static/img/vico.jpg", alt "Victor Borja", class "nx-photo" ] []
                , h1 [] [ text "Victor Borja" ]
                , p [ class "nx-role" ] [ text "Software Engineer · Open-Source Author · Effect Systems, Compilers & Runtimes" ]
                , dl []
                    [ dt [] [ text "Based in" ]
                    , dd [] [ text "Mexico City" ]
                    , dt [] [ text "Open source since" ]
                    , dd [] [ text "1999 · GitHub user #331" ]
                    , dt [] [ text "denful stars" ]
                    , dd [] [ text (String.fromInt denful) ]
                    , dt [] [ text "Contact" ]
                    , dd [] [ a [ href "mailto:vborja@apache.org" ] [ text "vborja@apache.org" ] ]
                    ]
                , div [ class "nx-buttons" ]
                    [ a [ class "nx-btn", href "https://github.com/vic" ] [ text "GitHub" ]
                    , a [ class "nx-btn", href "https://denful.dev" ] [ text "denful.dev" ]
                    , a [ class "nx-btn nx-return", href Common.fundUrl ] [ text "Sponsor ↵" ]
                    ]
                ]
            , window "cv"
                "CV.md — ~/vic"
                [ case m.cv of
                    Just md ->
                        Markdown.toHtml [ class "nx-doc" ] (Common.siteLinks m.flags md)

                    Nothing ->
                        p [] [ text "Loading…" ]
                ]
            , window "projects"
                "Projects — by stars"
                [ ul [ class "nx-projects" ]
                    (List.map
                        (\r ->
                            li []
                                [ a [ href r.url ] [ text r.fullName ]
                                , span [ class "nx-stars" ] [ text ("★ " ++ String.fromInt r.stars) ]
                                , p [] [ text r.description ]
                                ]
                        )
                        top
                    )
                ]
            ]
        ]
