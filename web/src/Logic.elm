module Logic exposing (Engine(..), Outcome, needs, presetProgram, presets, similarTo, solve)

{-| The logic window without the window: presets, and one call that solves a
program with either engine over a set of facts.
-}

import Datalog exposing (Db)
import Dict
import Facts
import Horn exposing (Val)
import Kanren


type Engine
    = Bottom
    | TopDown


type alias Outcome =
    { vars : List String, rows : List (List Val), stats : String }


presets : List ( String, Engine, String )
presets =
    [ ( "Nix repos and their topics"
      , Bottom
      , "% Datalog, bottom-up: every answer.\nnix(R, T) :- own(R), lang(R, \"Nix\"), topic(R, T).\n?- nix(R, T)."
      )
    , ( "Topics my repos connect to algebraic effects"
      , Bottom
      , "% Two topics are near when one of my repos has both.\nnear(A, B) :- own(R), topic(R, A), topic(R, B), A != B.\n% reach is the transitive closure from one topic.\nreach(T) :- near(\"algebraic-effects\", T).\nreach(T) :- reach(S), near(S, T).\n?- reach(T)."
      )
    , ( "Ideas: starred repos on my topics, not mine"
      , Bottom
      , "mytopic(T) :- own(R), topic(R, T), pushed(R, Y), Y >= 2025.\nidea(S, T) :- mytopic(T), topic(S, T), starred(S), owner(S, O), O != \"vic\", O != \"denful\".\n?- idea(S, T)."
      )
    , ( "Repos I worked on that are not mine"
      , Bottom
      , "elsewhere(R, Y, N) :- worked(R, Y, N), owner(R, O), O != \"vic\", O != \"denful\".\nelsewhere(R, Y, N) :- worked(R, Y, N), N >= 20.\n?- elsewhere(R, Y, N)."
      )
    , ( "GH Archive: people who star two of my repos"
      , Bottom
      , "fan(P) :- gh_stargazer(P, A), gh_stargazer(P, B), A != B.\n?- fan(P)."
      )
    , ( "GH Archive: what my fans also star"
      , Bottom
      , "fan(P) :- gh_stargazer(P, A), gh_stargazer(P, B), A != B.\nsuggest(R) :- fan(P), gh_star(P, R).\n?- suggest(R)."
      )
    , ( "GH Archive: kin who share 20+ stars with me"
      , Bottom
      , "kin(P, N) :- gh_kin(P, N), N >= 20.\n?- kin(P, N)."
      )
    , ( "μKanren: first 50 topics reachable from nix"
      , TopDown
      , "% μKanren, top-down: the first answers of a search that need not end.\nnear(A, B) :- topic(R, A), topic(R, B), A != B, own(R).\npath(A, B) :- near(A, B).\npath(A, C) :- near(A, B), path(B, C).\n?- path(\"nix\", T)."
      )
    ]


presetProgram : Int -> String
presetProgram i =
    List.drop i presets |> List.head |> Maybe.map (\( _, _, p ) -> p) |> Maybe.withDefault ""


similarTo : String -> String
similarTo repo =
    let
        r =
            "\"" ++ String.replace "\"" "" repo ++ "\""
    in
    "% People who star " ++ r ++ " in GH Archive, and what else they star.\nfan(P) :- gh_stargazer(P, " ++ r ++ ").\nsuggest(R) :- fan(P), gh_star(P, R), R != " ++ r ++ ".\n?- suggest(R)."


answersLimit : Int
answersLimit =
    50


kanrenBudget : Int
kanrenBudget =
    300000


{-| The `gh_*` predicates a program names that `loaded` does not hold.
-}
needs : (String -> Bool) -> Horn.Program -> List String
needs loaded p =
    Horn.preds p
        |> List.map Tuple.first
        |> List.filter (\name -> List.any (\( pred, _ ) -> pred == name) Facts.archiveSources && not (loaded name))


solve : Engine -> Db -> Horn.Program -> Result String Outcome
solve engine db p =
    case engine of
        Bottom ->
            Datalog.solve db p.rules
                |> Result.map
                    (\out ->
                        let
                            a =
                                Datalog.answers out p.query
                        in
                        Outcome a.vars a.rows ("Datalog · " ++ String.fromInt (List.length a.rows) ++ " answers")
                    )

        TopDown ->
            let
                r =
                    Kanren.run answersLimit kanrenBudget db p.rules p.query
            in
            Ok
                (Outcome r.vars
                    r.rows
                    ("μKanren · first "
                        ++ String.fromInt (List.length r.rows)
                        ++ " answers in "
                        ++ String.fromInt r.steps
                        ++ " steps"
                        ++ (if r.complete then
                                ", search complete"

                            else
                                ", search stopped"
                           )
                    )
                )
