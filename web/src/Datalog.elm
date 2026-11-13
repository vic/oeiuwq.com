module Datalog exposing (Answers, Db, Relation, answers, insert, solve)

{-| Bottom-up Datalog with semi-naive evaluation.

Each round joins every rule once for each body atom of a derived predicate,
reading that atom from the facts new in the last round and the other atoms
from all facts. It stops when a round finds nothing new.

-}

import Dict exposing (Dict)
import Horn exposing (Atom, Lit(..), Op(..), Rule, Term(..), Val(..))
import Set exposing (Set)


{-| Tuples of one predicate, by `Horn.key`, so a tuple is stored once.
-}
type alias Relation =
    Dict String (List Val)


type alias Db =
    Dict String Relation


type alias Answers =
    { vars : List String, rows : List (List Val) }


{-| The most facts a program may hold before the solver stops it.
-}
maxFacts : Int
maxFacts =
    400000


insert : String -> List Val -> Db -> Db
insert pred tuple db =
    Dict.update pred (\r -> Just (Dict.insert (Horn.key tuple) tuple (Maybe.withDefault Dict.empty r))) db



-- PLANS


{-| One step of a rule body, in the order it runs. `Join` knows which argument
positions are already bound when it runs, so it can use an index on them.
-}
type Step
    = Join Atom (List Int)
    | Test Op Term Term
    | Bind String Term


type alias Plan =
    { head : Atom, steps : List Step }


isBound : Set String -> Term -> Bool
isBound bound t =
    case t of
        Var v ->
            Set.member v bound

        Val _ ->
            True


{-| Orders a body: atoms as written, each comparison as soon as its variables
are bound. `X = t` with t bound binds X. A rule whose head or comparison
uses a variable no atom binds is unsafe and is an error.
-}
plan : Rule -> Result String Plan
plan rule =
    let
        name =
            rule.head.pred

        place bound pending acc =
            -- run every pending comparison that is ready; keep the rest
            List.foldl
                (\( op, x, y ) ( b, wait, out ) ->
                    case ( op, isBound b x, isBound b y ) of
                        ( _, True, True ) ->
                            ( b, wait, Test op x y :: out )

                        ( Eq, False, True ) ->
                            case x of
                                Var v ->
                                    ( Set.insert v b, wait, Bind v y :: out )

                                Val _ ->
                                    ( b, wait, out )

                        ( Eq, True, False ) ->
                            case y of
                                Var v ->
                                    ( Set.insert v b, wait, Bind v x :: out )

                                Val _ ->
                                    ( b, wait, out )

                        _ ->
                            ( b, ( op, x, y ) :: wait, out )
                )
                ( bound, [], acc )
                pending

        go lits bound pending acc =
            let
                ( b1, wait1, acc1 ) =
                    place bound (List.reverse pending) acc
            in
            case lits of
                [] ->
                    if List.isEmpty wait1 then
                        Ok ( b1, List.reverse acc1 )

                    else
                        Err (name ++ ": a comparison uses a variable that no predicate binds")

                (Pos a) :: rest ->
                    let
                        positions =
                            List.indexedMap Tuple.pair a.args |> List.filter (\( _, t ) -> isBound b1 t) |> List.map Tuple.first
                    in
                    go rest (Set.union b1 (Horn.atomVars a)) wait1 (Join a positions :: acc1)

                (Cmp op x y) :: rest ->
                    go rest b1 (( op, x, y ) :: wait1) acc1
    in
    go rule.body Set.empty [] []
        |> Result.andThen
            (\( bound, steps ) ->
                if Set.isEmpty (Set.diff (Horn.atomVars rule.head) bound) then
                    Ok { head = rule.head, steps = steps }

                else
                    Err (name ++ ": the head uses a variable that the body does not bind")
            )



-- JOINS


type alias Binding =
    Dict String Val


value : Binding -> Term -> Maybe Val
value b t =
    case t of
        Var v ->
            Dict.get v b

        Val c ->
            Just c


{-| Extends a binding with a tuple, or Nothing when they disagree.
-}
extend : List Term -> List Val -> Binding -> Maybe Binding
extend args tuple b =
    case ( args, tuple ) of
        ( [], [] ) ->
            Just b

        ( t :: ts, v :: vs ) ->
            case value b t of
                Just w ->
                    if w == v then
                        extend ts vs b

                    else
                        Nothing

                Nothing ->
                    case t of
                        Var name ->
                            extend ts vs (Dict.insert name v b)

                        Val _ ->
                            Nothing

        _ ->
            Nothing


pick : List Int -> List a -> List a
pick positions xs =
    List.filterMap (\i -> List.drop i xs |> List.head) positions


index : List Int -> Relation -> Dict String (List (List Val))
index positions rel =
    Dict.foldl (\_ tuple acc -> Dict.update (Horn.key (pick positions tuple)) (\l -> Just (tuple :: Maybe.withDefault [] l)) acc) Dict.empty rel


test : Op -> Val -> Val -> Bool
test op a b =
    let
        o =
            Horn.compare a b
    in
    case op of
        Eq ->
            o == EQ

        Ne ->
            o /= EQ

        Lt ->
            o == LT

        Le ->
            o /= GT

        Gt ->
            o == GT

        Ge ->
            o /= LT


{-| The head tuples a plan derives; step `deltaAt` reads `delta` instead of
`full`.
-}
run : Db -> Maybe ( Int, Relation ) -> Plan -> List (List Val)
run full delta p =
    let
        source i a =
            case delta of
                Just ( j, rel ) ->
                    if i == j then
                        rel

                    else
                        Dict.get a.pred full |> Maybe.withDefault Dict.empty

                Nothing ->
                    Dict.get a.pred full |> Maybe.withDefault Dict.empty

        step ( i, s ) bindings =
            case s of
                Join a positions ->
                    let
                        ix =
                            index positions (source i a)

                        boundArgs =
                            pick positions a.args
                    in
                    List.concatMap
                        (\b ->
                            case List.filterMap (value b) boundArgs of
                                vals ->
                                    Dict.get (Horn.key vals) ix
                                        |> Maybe.withDefault []
                                        |> List.filterMap (\tuple -> extend a.args tuple b)
                        )
                        bindings

                Test op x y ->
                    List.filter (\b -> Maybe.map2 (test op) (value b x) (value b y) |> Maybe.withDefault False) bindings

                Bind v t ->
                    List.filterMap (\b -> value b t |> Maybe.map (\c -> Dict.insert v c b)) bindings
    in
    List.foldl step [ Dict.empty ] (List.indexedMap Tuple.pair p.steps)
        |> List.filterMap (\b -> List.map (value b) p.head.args |> sequence)


sequence : List (Maybe a) -> Maybe (List a)
sequence =
    List.foldr (Maybe.map2 (::)) (Just [])



-- SOLVER


size : Db -> Int
size db =
    Dict.foldl (\_ r n -> n + Dict.size r) 0 db


{-| The tuples of `found` that `db` does not hold yet.
-}
fresh : Db -> List ( String, List Val ) -> Db
fresh db found =
    List.foldl
        (\( pred, tuple ) acc ->
            if Dict.get pred db |> Maybe.map (Dict.member (Horn.key tuple)) |> Maybe.withDefault False then
                acc

            else
                insert pred tuple acc
        )
        Dict.empty
        found


union : Db -> Db -> Db
union a b =
    Dict.foldl (\pred rel acc -> Dict.update pred (\r -> Just (Dict.union rel (Maybe.withDefault Dict.empty r))) acc) a b


checkArity : Db -> List Rule -> Result String ()
checkArity edb rules =
    let
        seen =
            Dict.foldl (\pred rel acc -> Dict.values rel |> List.head |> Maybe.map (\t -> Dict.insert pred (List.length t) acc) |> Maybe.withDefault acc) Dict.empty edb

        atoms =
            List.concatMap
                (\r ->
                    r.head
                        :: List.filterMap
                            (\l ->
                                case l of
                                    Pos a ->
                                        Just a

                                    Cmp _ _ _ ->
                                        Nothing
                            )
                            r.body
                )
                rules
    in
    List.foldl
        (\a acc ->
            acc
                |> Result.andThen
                    (\known ->
                        case Dict.get a.pred known of
                            Just n ->
                                if n == List.length a.args then
                                    Ok known

                                else
                                    Err (a.pred ++ " has " ++ String.fromInt n ++ " arguments, not " ++ String.fromInt (List.length a.args))

                            Nothing ->
                                Ok (Dict.insert a.pred (List.length a.args) known)
                    )
        )
        (Ok seen)
        atoms
        |> Result.map (\_ -> ())


{-| All facts that follow from the rules and the given facts.
-}
solve : Db -> List Rule -> Result String Db
solve edb rules =
    checkArity edb rules
        |> Result.andThen (\_ -> List.foldr (\r acc -> Result.map2 (::) (plan r) acc) (Ok []) rules)
        |> Result.andThen
            (\plans ->
                let
                    derived =
                        List.map (\p -> p.head.pred) plans |> Set.fromList

                    first =
                        fresh edb (List.concatMap (\p -> List.map (Tuple.pair p.head.pred) (run edb Nothing p)) plans)
                in
                loop derived plans (union edb first) first
            )


loop : Set String -> List Plan -> Db -> Db -> Result String Db
loop derived plans total delta =
    if Dict.isEmpty delta then
        Ok total

    else if size total > maxFacts then
        Err ("more than " ++ String.fromInt maxFacts ++ " facts: narrow the rules")

    else
        let
            found =
                List.concatMap
                    (\p ->
                        List.indexedMap Tuple.pair p.steps
                            |> List.concatMap
                                (\( i, s ) ->
                                    case s of
                                        Join a _ ->
                                            case ( Set.member a.pred derived, Dict.get a.pred delta ) of
                                                ( True, Just rel ) ->
                                                    List.map (Tuple.pair p.head.pred) (run total (Just ( i, rel )) p)

                                                _ ->
                                                    []

                                        _ ->
                                            []
                                )
                    )
                    plans

            next =
                fresh total found
        in
        loop derived plans (union total next) next


{-| The distinct values of the query variables, in the order they appear.
-}
answers : Db -> Atom -> Answers
answers db q =
    let
        vars =
            List.foldl
                (\t acc ->
                    case t of
                        Var v ->
                            if List.member v acc || String.startsWith "_" v then
                                acc

                            else
                                acc ++ [ v ]

                        Val _ ->
                            acc
                )
                []
                q.args

        rows =
            Dict.get q.pred db
                |> Maybe.withDefault Dict.empty
                |> Dict.values
                |> List.filterMap (\tuple -> extend q.args tuple Dict.empty)
                |> List.map (\b -> List.filterMap (\v -> Dict.get v b) vars)
                |> List.foldl (\row acc -> Dict.insert (Horn.key row) row acc) Dict.empty
                |> Dict.values
    in
    { vars = vars, rows = rows }
