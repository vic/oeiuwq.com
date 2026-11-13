module Facts exposing (archiveSources, catalog, local, withArchive)

{-| The facts the logic window starts from. Local facts come from the data
the binary embeds; `gh_*` facts come from GH Archive through the fixed
queries of the server, loaded when a program names them.
-}

import Common exposing (Repo, Year)
import Datalog exposing (Db)
import Dict
import Horn exposing (Val(..))


{-| Predicate, arguments, meaning: what the window lists for the visitor.
-}
catalog : List ( String, String, String )
catalog =
    [ ( "own", "R", "a repository of vic or denful" )
    , ( "fork", "R", "an own repository that is a fork" )
    , ( "starred", "R", "a repository vic starred" )
    , ( "starred_in", "R, Year", "the year vic starred R" )
    , ( "lang", "R, Language", "main language of an own or starred repo" )
    , ( "topic", "R, Topic", "a GitHub topic of an own or starred repo" )
    , ( "stars", "R, N", "stars of an own or starred repo" )
    , ( "owner", "R, Owner", "owner of an own or starred repo" )
    , ( "created", "R, Year", "year an own or starred repo was created" )
    , ( "pushed", "R, Year", "year of its last push" )
    , ( "worked", "R, Year, N", "public commits, PRs and issues of vic, any repo" )
    , ( "gh_stargazer", "Person, R", "GH Archive: who stars the repos of vic" )
    , ( "gh_star", "Person, R", "GH Archive: what those people star (top 300 repos)" )
    , ( "gh_kin", "Person, N", "GH Archive: people who star N of the repos vic stars" )
    , ( "gh_event", "R, Year, N", "GH Archive: events of vic by repo and year" )
    ]


{-| The server source of each `gh_*` predicate.
-}
archiveSources : List ( String, String )
archiveSources =
    [ ( "gh_stargazer", "stargazer" ), ( "gh_star", "star" ), ( "gh_kin", "kin" ), ( "gh_event", "event" ) ]


year : String -> Val
year iso =
    N (Common.yearOf iso)


local : List Repo -> List Repo -> List Year -> Db
local own stars years =
    let
        about r db =
            db
                |> (if r.language /= "" then
                        Datalog.insert "lang" [ S r.fullName, S r.language ]

                    else
                        identity
                   )
                |> (\d -> List.foldl (\t -> Datalog.insert "topic" [ S r.fullName, S t ]) d r.topics)
                |> Datalog.insert "stars" [ S r.fullName, N r.stars ]
                |> Datalog.insert "owner" [ S r.fullName, S r.owner ]
                |> Datalog.insert "created" [ S r.fullName, year r.createdAt ]
                |> Datalog.insert "pushed" [ S r.fullName, year r.pushedAt ]

        ownFacts =
            List.foldl
                (\r db ->
                    db
                        |> Datalog.insert "own" [ S r.fullName ]
                        |> (if r.fork then
                                Datalog.insert "fork" [ S r.fullName ]

                            else
                                identity
                           )
                        |> about r
                )
                Dict.empty
                own

        starFacts =
            List.foldl
                (\r db ->
                    db
                        |> Datalog.insert "starred" [ S r.fullName ]
                        |> (case r.starredAt of
                                Just at ->
                                    Datalog.insert "starred_in" [ S r.fullName, year at ]

                                Nothing ->
                                    identity
                           )
                        |> about r
                )
                ownFacts
                stars
    in
    List.foldl
        (\y db -> List.foldl (\w -> Datalog.insert "worked" [ S w.repo, N y.year, N (w.commits + w.prs + w.issues) ]) db y.repos)
        starFacts
        years


{-| Adds the rows of one `gh_*` predicate.
-}
withArchive : String -> List (List Val) -> Db -> Db
withArchive pred rows db =
    List.foldl (Datalog.insert pred) db rows
