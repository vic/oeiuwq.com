module LogicTest exposing (suite)

import Datalog
import Dict
import Expect
import Horn exposing (Val(..))
import Kanren
import Set
import Test exposing (Test, describe, test)


{-| A chain a -> b -> c -> d, and a cycle x -> y -> x.
-}
edges : List ( String, String )
edges =
    [ ( "a", "b" ), ( "b", "c" ), ( "c", "d" ), ( "x", "y" ), ( "y", "x" ) ]


edb : Datalog.Db
edb =
    List.foldl (\( a, b ) db -> Datalog.insert "e" [ S a, S b ] db) Dict.empty edges
        |> Datalog.insert "stars" [ S "den", N 430 ]
        |> Datalog.insert "stars" [ S "zen", N 9 ]


{-| Transitive closure by repeated squaring of plain lists: an oracle that
shares no code with the solvers.
-}
closure : List ( String, String ) -> List ( String, String )
closure es =
    let
        step s =
            Set.union s (Set.fromList (List.concatMap (\( a, b ) -> Set.toList s |> List.filter (\( c, _ ) -> c == b) |> List.map (\( _, d ) -> ( a, d ))) (Set.toList s)))

        fix s =
            let
                n =
                    step s
            in
            if n == s then
                s

            else
                fix n
    in
    Set.toList (fix (Set.fromList es))


rows : List (List Val) -> List ( String, String )
rows =
    List.filterMap
        (\r ->
            case r of
                [ S a, S b ] ->
                    Just ( a, b )

                _ ->
                    Nothing
        )
        >> List.sort


datalog : String -> Result String Datalog.Answers
datalog src =
    Horn.parse src |> Result.andThen (\p -> Datalog.solve edb p.rules |> Result.map (\db -> Datalog.answers db p.query))


kanren : Int -> String -> Result String Kanren.Result_
kanren n src =
    Horn.parse src |> Result.map (\p -> Kanren.run n 20000 edb p.rules p.query)


rightRec : String
rightRec =
    "anc(X, Y) :- e(X, Y).\nanc(X, Z) :- e(X, Y), anc(Y, Z).\n?- anc(A, B)."


leftRec : String
leftRec =
    "anc(X, Y) :- e(X, Y).\nanc(X, Z) :- anc(X, Y), e(Y, Z).\n?- anc(A, B)."


suite : Test
suite =
    describe "logic"
        [ describe "Datalog"
            [ test "semi-naive closure equals the oracle, cycles included" <|
                \_ -> datalog rightRec |> Result.map (.rows >> rows) |> Expect.equal (Ok (closure edges))
            , test "left recursion gives the same closure" <|
                \_ -> datalog leftRec |> Result.map (.rows >> rows) |> Expect.equal (Ok (closure edges))
            , test "comparisons filter bound values" <|
                \_ -> datalog "big(R) :- stars(R, N), N > 100.\n?- big(R)." |> Result.map .rows |> Expect.equal (Ok [ [ S "den" ] ])
            , test "= binds a variable" <|
                \_ -> datalog "p(X, Y) :- e(X, \"b\"), Y = 7.\n?- p(X, Y)." |> Result.map .rows |> Expect.equal (Ok [ [ S "a", N 7 ] ])
            , test "each _ is its own variable" <|
                \_ -> datalog "mid(X) :- e(_, X), e(X, _).\n?- mid(X)." |> Result.map (.rows >> List.length) |> Expect.equal (Ok 4)
            , test "a constant in the query selects" <|
                \_ -> datalog (String.replace "?- anc(A, B)." "?- anc(\"a\", B)." rightRec) |> Result.map (.rows >> List.length) |> Expect.equal (Ok 3)
            , test "an unsafe head is an error" <|
                \_ -> datalog "p(X, Y) :- e(X, Z).\n?- p(X, Y)." |> Expect.err
            , test "a wrong arity is an error" <|
                \_ -> datalog "p(X) :- e(X).\n?- p(X)." |> Expect.err
            , test "a program without a query is an error" <|
                \_ -> datalog "p(X) :- e(X, Y)." |> Expect.err
            ]
        , describe "μKanren"
            [ test "finds the same closure as Datalog" <|
                \_ -> kanren 100 rightRec |> Result.map (.rows >> rows) |> Expect.equal (Ok (closure edges))
            , test "left recursion still answers, then hits the budget" <|
                \_ ->
                    kanren 100 leftRec
                        |> Result.map (\r -> ( rows r.rows, r.complete ))
                        |> Expect.equal (Ok ( closure edges, False ))
            , test "a looping clause does not starve the next one" <|
                \_ -> kanren 1 "p(X) :- p(X).\np(\"z\").\n?- p(X)." |> Result.map .rows |> Expect.equal (Ok [ [ S "z" ] ])
            , test "stops at n answers" <|
                \_ -> kanren 2 rightRec |> Result.map (.rows >> List.length) |> Expect.equal (Ok 2)
            , test "comparisons on bound values" <|
                \_ -> kanren 10 "big(R) :- stars(R, N), N > 100.\n?- big(R)." |> Result.map .rows |> Expect.equal (Ok [ [ S "den" ] ])
            ]
        ]
