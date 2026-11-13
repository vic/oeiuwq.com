module Blog exposing (main)

{-| blog.oeiuwq.com: an ANSI BBS, 80 columns. Number keys read a message,
Q or Esc goes back, the letter keys jump to the other subdomains.
-}

import Browser
import Browser.Navigation as Nav
import Common exposing (Flags, Repo)
import Dict
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick)
import Http
import Json.Decode as D
import Markdown


type alias Post =
    { slug : String, title : String, date : String, body : String }


type alias Model =
    { flags : Flags
    , posts : Maybe (List Post)
    , reading : Maybe Post
    , repos : List Repo
    , callers : List String
    }


type Msg
    = GotPosts (Result Http.Error (List Post))
    | Read Post
    | Back
    | Key String
    | GotRepos (Result Http.Error (List Repo))
    | GotCallers (Result Http.Error (List String))


main : Program D.Value Model Msg
main =
    Browser.element { init = init, update = update, view = view, subscriptions = \_ -> Common.onKey Key }


init : D.Value -> ( Model, Cmd Msg )
init v =
    ( { flags = D.decodeValue Common.flagsDecoder v |> Result.withDefault { scheme = "", sites = Dict.empty, hash = "" }
      , posts = Nothing
      , reading = Nothing
      , repos = []
      , callers = []
      }
    , Cmd.batch
        [ Common.getJson "/api/repos" (D.list Common.repoDecoder) GotRepos
        , Common.getJson "/api/sponsors" (D.list (D.field "login" D.string)) GotCallers
        , Common.getJson "/api/posts"
            (D.list (D.map4 Post (D.field "slug" D.string) (D.field "title" D.string) (D.field "date" D.string) (D.field "body" D.string)))
            GotPosts
        ]
    )


{-| Newest first.
-}
posts : Model -> List Post
posts m =
    Maybe.withDefault [] m.posts |> List.sortBy .slug |> List.reverse


doors : List ( String, String, String )
doors =
    List.map (\pl -> ( doorKey pl.name, pl.name, pl.title ++ ": " ++ pl.blurb )) (Common.placesBut "blog")


doorKey : String -> String
doorKey name =
    Dict.get name (Dict.fromList [ ( "home", "G" ), ( "codes", "C" ), ( "projects", "I" ), ( "stars", "S" ), ( "portfolio", "P" ), ( "smalltalk", "T" ), ( "nes", "N" ), ( "adventure", "A" ), ( "sponsor", "F" ), ( "faith", "H" ), ( "love", "L" ) ])
        |> Maybe.withDefault "?"


update : Msg -> Model -> ( Model, Cmd Msg )
update msg m =
    case msg of
        GotRepos r ->
            ( { m | repos = Result.withDefault [] r }, Cmd.none )

        GotCallers r ->
            ( { m | callers = Result.withDefault [] r }, Cmd.none )

        GotPosts r ->
            let
                ps =
                    Result.withDefault [] r
            in
            ( { m | posts = Just ps, reading = List.filter (\p -> p.slug == m.flags.hash) ps |> List.head }, Cmd.none )

        Read p ->
            ( { m | reading = Just p }, Cmd.none )

        Back ->
            ( { m | reading = Nothing }, Cmd.none )

        Key k ->
            let
                up =
                    String.toUpper k
            in
            if up == "Q" || k == "Escape" then
                ( { m | reading = Nothing }, Cmd.none )

            else
                case String.toInt k of
                    Just n ->
                        case List.drop (n - 1) (posts m) |> List.head of
                            Just p ->
                                ( { m | reading = Just p }, Cmd.none )

                            Nothing ->
                                ( m, Cmd.none )

                    Nothing ->
                        case List.filter (\( key, _, _ ) -> key == up) doors |> List.head of
                            Just ( _, name, _ ) ->
                                ( m, Nav.load (Common.site m.flags name) )

                            Nothing ->
                                ( m, Cmd.none )


banner : String
banner =
    String.join "\n"
        [ "╔══════════════════════════════════════════════════════════════════════════════╗"
        , "║ ░▒▓█  o e i u w q   B B S  █▓▒░                           sysop: vic         ║"
        , "║      compilers · effect systems · nix · faith · whatever I fell into         ║"
        , "╚══════════════════════════════════════════════════════════════════════════════╝"
        ]


view : Model -> Html Msg
view m =
    div [ class "bbs" ]
        [ pre [ class "banner" ] [ text banner ]
        , case m.reading of
            Just post ->
                div [ class "msg" ]
                    [ div [ class "hdr" ]
                        [ div [] [ span [ class "k" ] [ text "Subj: " ], text post.title ]
                        , div [] [ span [ class "k" ] [ text "From: " ], text "vic" ]
                        , div [] [ span [ class "k" ] [ text "Date: " ], text post.date ]
                        ]
                    , Markdown.toHtml [ class "body" ] (Common.siteLinks m.flags post.body)
                    , p [ class "prompt" ] [ button [ onClick Back ] [ text "[Q]" ], text " back to the message list" ]
                    ]

            Nothing ->
                div [ class "main" ]
                    [ h1 [] [ text "Message base: General" ]
                    , case m.posts of
                        Nothing ->
                            p [ class "dim" ] [ text "Dialing…" ]

                        Just [] ->
                            p [ class "dim" ] [ text "No messages in this conference yet." ]

                        Just _ ->
                            ol [ class "list" ]
                                (List.indexedMap
                                    (\i p ->
                                        li []
                                            [ button [ onClick (Read p) ]
                                                [ span [ class "n" ] [ text ("[" ++ String.fromInt (i + 1) ++ "]") ]
                                                , span [ class "d" ] [ text p.date ]
                                                , span [ class "t" ] [ text p.title ]
                                                ]
                                            ]
                                    )
                                    (posts m)
                                )
                    , h1 [] [ text "Bulletins: fresh from the workshop" ]
                    , ul [ class "bulletins" ]
                        (m.repos
                            |> List.filter (not << .fork)
                            |> List.sortBy .pushedAt
                            |> List.reverse
                            |> List.take 6
                            |> List.map (\r -> li [] [ span [ class "d" ] [ text (String.left 10 r.pushedAt) ], text " ", a [ href r.url ] [ text r.fullName ], span [ class "dim" ] [ text (" " ++ String.left 60 r.description) ] ])
                        )
                    , h1 [] [ text "Last callers" ]
                    , p [ class "callers" ]
                        (if List.isEmpty m.callers then
                            [ text "Be the first caller: ", a [ href Common.fundUrl ] [ text "sponsor the sysop" ] ]

                         else
                            List.map (\c -> a [ href ("https://github.com/" ++ c) ] [ text c ]) m.callers ++ [ span [ class "dim" ] [ text " ...thank you, callers. " ], a [ href Common.fundUrl ] [ text "[F] join them" ] ]
                        )
                    , h1 [] [ text "Doors" ]
                    , ul [ class "doors" ]
                        (List.map
                            (\( key, name, desc ) ->
                                li [] [ a [ href (Common.site m.flags name) ] [ span [ class "n" ] [ text ("[" ++ key ++ "]") ], text (" " ++ desc) ] ]
                            )
                            doors
                        )
                    , p [ class "prompt" ] [ text "Select: ", span [ class "cursor" ] [ text "█" ] ]
                    ]
        , footer [] [ text "Number keys read · Q back · letter keys open a door" ]
        ]
