module Kanren exposing (Result_, run)

{-| μKanren (Hemann and Friedman, 2013): goals map a state to a lazy stream
of states. `disj` interleaves its streams, so a goal that recurses forever
on one branch still lets the other branch answer. Rules become goals
top-down, and `run` takes the first answers within a step budget.

Comparisons other than `=` need bound values; on an unbound value they
fail. This is plain μKanren, without disequality constraints.

-}

import Datalog exposing (Db)
import Dict exposing (Dict)
import Horn exposing (Atom, Lit(..), Op(..), Rule, Term(..), Val)


type KT
    = KV Int
    | KC Val


type alias State =
    { sub : Dict Int KT, next : Int }


type Stream
    = Nil
    | Cons State Stream
    | Later (() -> Stream)


type alias Goal =
    State -> Stream


type alias Result_ =
    { vars : List String, rows : List (List Val), steps : Int, complete : Bool }



-- CORE


walk : Dict Int KT -> KT -> KT
walk s t =
    case t of
        KV v ->
            case Dict.get v s of
                Just u ->
                    walk s u

                Nothing ->
                    t

        KC _ ->
            t


unify : KT -> KT -> Dict Int KT -> Maybe (Dict Int KT)
unify a b s =
    case ( walk s a, walk s b ) of
        ( KV x, KV y ) ->
            if x == y then
                Just s

            else
                Just (Dict.insert x (KV y) s)

        ( KV x, c ) ->
            Just (Dict.insert x c s)

        ( c, KV y ) ->
            Just (Dict.insert y c s)

        ( KC x, KC y ) ->
            if x == y then
                Just s

            else
                Nothing


unifyAll : List KT -> List KT -> Dict Int KT -> Maybe (Dict Int KT)
unifyAll xs ys s =
    case ( xs, ys ) of
        ( x :: xr, y :: yr ) ->
            unify x y s |> Maybe.andThen (unifyAll xr yr)

        ( [], [] ) ->
            Just s

        _ ->
            Nothing


mplus : Stream -> Stream -> Stream
mplus a b =
    case a of
        Nil ->
            b

        Cons st rest ->
            Cons st (Later (\_ -> mplus b rest))

        Later f ->
            Later (\_ -> mplus b (f ()))


bind : Stream -> Goal -> Stream
bind str g =
    case str of
        Nil ->
            Nil

        Cons st rest ->
            mplus (g st) (Later (\_ -> bind rest g))

        Later f ->
            Later (\_ -> bind (f ()) g)


disj : Goal -> Goal -> Goal
disj g1 g2 st =
    mplus (g1 st) (g2 st)


conj : Goal -> Goal -> Goal
conj g1 g2 st =
    bind (g1 st) g2


succeed : Goal
succeed st =
    Cons st Nil



-- PROGRAMS AS GOALS


type alias Program =
    { rules : Dict String (List Rule)
    , facts : Dict String { all : List (List Val), byFirst : Dict String (List (List Val)) }
    }


compile : Db -> List Rule -> Program
compile db rules =
    { rules = List.foldr (\r acc -> Dict.update r.head.pred (\l -> Just (r :: Maybe.withDefault [] l)) acc) Dict.empty rules
    , facts =
        Dict.map
            (\_ rel ->
                let
                    tuples =
                        Dict.values rel
                in
                { all = tuples
                , byFirst =
                    List.foldl
                        (\t acc ->
                            case t of
                                v :: _ ->
                                    Dict.update (Horn.key [ v ]) (\l -> Just (t :: Maybe.withDefault [] l)) acc

                                [] ->
                                    acc
                        )
                        Dict.empty
                        tuples
                }
            )
            db
    }


{-| Turns a stream of the states that a list of tuples allows, lazily.
-}
fromList : List State -> Stream
fromList sts =
    case sts of
        [] ->
            Nil

        st :: rest ->
            Cons st (Later (\_ -> fromList rest))


factGoal : Program -> String -> List KT -> Goal
factGoal p pred args st =
    case Dict.get pred p.facts of
        Nothing ->
            Nil

        Just f ->
            let
                candidates =
                    case List.map (walk st.sub) args of
                        (KC v) :: _ ->
                            Dict.get (Horn.key [ v ]) f.byFirst |> Maybe.withDefault []

                        _ ->
                            f.all
            in
            candidates
                |> List.filterMap (\t -> unifyAll args (List.map KC t) st.sub |> Maybe.map (\s -> { st | sub = s }))
                |> fromList


{-| Renames the variables of a clause to fresh logic variables.
-}
freshVars : List String -> State -> ( Dict String KT, State )
freshVars names st =
    List.foldl
        (\n ( env, s ) ->
            if Dict.member n env then
                ( env, s )

            else
                ( Dict.insert n (KV s.next) env, { s | next = s.next + 1 } )
        )
        ( Dict.empty, st )
        names


toKT : Dict String KT -> Term -> KT
toKT env t =
    case t of
        Var v ->
            Dict.get v env |> Maybe.withDefault (KV -1)

        Val c ->
            KC c


termVars : List Term -> List String
termVars =
    List.filterMap
        (\t ->
            case t of
                Var v ->
                    Just v

                Val _ ->
                    Nothing
        )


clauseVars : Rule -> List String
clauseVars r =
    termVars r.head.args
        ++ List.concatMap
            (\l ->
                case l of
                    Pos a ->
                        termVars a.args

                    Cmp _ x y ->
                        termVars [ x, y ]
            )
            r.body


compareGoal : Op -> KT -> KT -> Goal
compareGoal op x y st =
    case op of
        Eq ->
            case unify x y st.sub of
                Just s ->
                    succeed { st | sub = s }

                Nothing ->
                    Nil

        _ ->
            case ( walk st.sub x, walk st.sub y ) of
                ( KC a, KC b ) ->
                    let
                        o =
                            Horn.compare a b

                        ok =
                            case op of
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

                                Eq ->
                                    o == EQ
                    in
                    if ok then
                        succeed st

                    else
                        Nil

                _ ->
                    Nil


{-| A call of a predicate: its facts or any of its clauses. The call is
delayed, so a recursive predicate builds its stream one step at a time.
-}
call : Program -> String -> List KT -> Goal
call p pred args st =
    Later
        (\_ ->
            List.foldl
                (\r acc ->
                    disj acc
                        (\s0 ->
                            let
                                ( env, s1 ) =
                                    freshVars (clauseVars r) s0
                            in
                            case unifyAll args (List.map (toKT env) r.head.args) s1.sub of
                                Just sub ->
                                    body p env r.body { s1 | sub = sub }

                                Nothing ->
                                    Nil
                        )
                )
                (factGoal p pred args)
                (Dict.get pred p.rules |> Maybe.withDefault [])
                st
        )


body : Program -> Dict String KT -> List Lit -> Goal
body p env lits =
    case lits of
        [] ->
            succeed

        l :: rest ->
            conj
                (case l of
                    Pos a ->
                        call p a.pred (List.map (toKT env) a.args)

                    Cmp op x y ->
                        compareGoal op (toKT env x) (toKT env y)
                )
                (body p env rest)


{-| The first `n` distinct answers of the query, within `budget` steps.
-}
run : Int -> Int -> Db -> List Rule -> Atom -> Result_
run n budget db rules q =
    let
        p =
            compile db rules

        vars =
            termVars q.args
                |> List.foldl
                    (\v acc ->
                        if List.member v acc || String.startsWith "_" v then
                            acc

                        else
                            acc ++ [ v ]
                    )
                    []

        ( env, st0 ) =
            freshVars (termVars q.args) { sub = Dict.empty, next = 0 }

        reify st =
            List.map (\v -> walk st.sub (Dict.get v env |> Maybe.withDefault (KV -1))) vars
                |> List.map
                    (\t ->
                        case t of
                            KC c ->
                                Just c

                            KV _ ->
                                Nothing
                    )
    in
    take n budget vars reify (call p q.pred (List.map (toKT env) q.args) st0) 0 Dict.empty


take : Int -> Int -> List String -> (State -> List (Maybe Val)) -> Stream -> Int -> Dict String (List Val) -> Result_
take n budget vars reify str steps found =
    let
        done complete =
            { vars = vars, rows = Dict.values found, steps = steps, complete = complete }
    in
    if Dict.size found >= n then
        done False

    else if steps >= budget then
        done False

    else
        case str of
            Nil ->
                done True

            Cons st rest ->
                -- an answer with an unbound variable is skipped: rows hold values only
                case List.foldr (Maybe.map2 (::)) (Just []) (reify st) of
                    Just row ->
                        take n budget vars reify rest (steps + 1) (Dict.insert (Horn.key row) row found)

                    Nothing ->
                        take n budget vars reify rest (steps + 1) found

            Later f ->
                take n budget vars reify (f ()) (steps + 1) found
