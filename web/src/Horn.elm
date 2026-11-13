module Horn exposing
    ( Atom
    , Lit(..)
    , Op(..)
    , Program
    , Rule
    , Term(..)
    , Val(..)
    , atomVars
    , compare
    , key
    , litVars
    , parse
    , preds
    , showVal
    )

{-| Horn clauses, the language both solvers read:

    % a comment
    reach(T) :- related("algebraic-effects", T).
    reach(T) :- reach(S), related(S, T), S != T.
    ?- reach(T).

Variables start with an upper-case letter or `_`. Values are "strings" and
integers. Comparisons: `=`, `!=`, `<`, `<=`, `>`, `>=`.

-}

import Dict
import Set exposing (Set)


type Val
    = S String
    | N Int


type Term
    = Var String
    | Val Val


type alias Atom =
    { pred : String, args : List Term }


type Op
    = Eq
    | Ne
    | Lt
    | Le
    | Gt
    | Ge


type Lit
    = Pos Atom
    | Cmp Op Term Term


type alias Rule =
    { head : Atom, body : List Lit }


type alias Program =
    { rules : List Rule, query : Atom }


showVal : Val -> String
showVal v =
    case v of
        S s ->
            s

        N n ->
            String.fromInt n


{-| A string that is equal for two tuples exactly when the tuples are equal.
-}
key : List Val -> String
key vals =
    String.join "\u{0000}"
        (List.map
            (\v ->
                case v of
                    S s ->
                        "s" ++ s

                    N n ->
                        "n" ++ String.fromInt n
            )
            vals
        )


{-| Integers order before strings; each kind orders as usual.
-}
compare : Val -> Val -> Order
compare a b =
    case ( a, b ) of
        ( N x, N y ) ->
            Basics.compare x y

        ( S x, S y ) ->
            Basics.compare x y

        ( N _, S _ ) ->
            LT

        ( S _, N _ ) ->
            GT


atomVars : Atom -> Set String
atomVars a =
    List.foldl
        (\t acc ->
            case t of
                Var v ->
                    Set.insert v acc

                Val _ ->
                    acc
        )
        Set.empty
        a.args


litVars : Lit -> Set String
litVars l =
    case l of
        Pos a ->
            atomVars a

        Cmp _ x y ->
            atomVars { pred = "", args = [ x, y ] }


{-| Every predicate name a program mentions, with its arity.
-}
preds : Program -> List ( String, Int )
preds p =
    let
        ofAtom a =
            ( a.pred, List.length a.args )

        ofLit l =
            case l of
                Pos a ->
                    [ ofAtom a ]

                Cmp _ _ _ ->
                    []
    in
    (ofAtom p.query :: List.concatMap (\r -> ofAtom r.head :: List.concatMap ofLit r.body) p.rules)
        |> Dict.fromList
        |> Dict.toList



-- TOKENS


type Tok
    = TName String
    | TVar String
    | TStr String
    | TNum Int
    | TSym String


tokenize : List Char -> List Tok -> Result String (List Tok)
tokenize cs acc =
    case cs of
        [] ->
            Ok (List.reverse acc)

        c :: rest ->
            if c == ' ' || c == '\n' || c == '\t' || c == '\u{000D}' then
                tokenize rest acc

            else if c == '%' then
                tokenize (dropWhile ((/=) '\n') rest) acc

            else if c == '"' then
                let
                    ( str, after ) =
                        span ((/=) '"') rest
                in
                case after of
                    '"' :: more ->
                        tokenize more (TStr (String.fromList str) :: acc)

                    _ ->
                        Err "a string has no closing quote"

            else if Char.isDigit c || (c == '-' && (List.head rest |> Maybe.map Char.isDigit |> Maybe.withDefault False)) then
                let
                    ( ds, after ) =
                        span Char.isDigit rest
                in
                case String.toInt (String.fromList (c :: ds)) of
                    Just n ->
                        tokenize after (TNum n :: acc)

                    Nothing ->
                        Err "bad number"

            else if Char.isAlpha c || c == '_' then
                let
                    ( w, after ) =
                        span (\x -> Char.isAlphaNum x || x == '_') rest

                    word =
                        String.fromList (c :: w)
                in
                tokenize after
                    ((if Char.isUpper c || c == '_' then
                        TVar
                            (if word == "_" then
                                "_" ++ String.fromInt (List.length acc)

                             else
                                word
                            )

                      else
                        TName word
                     )
                        :: acc
                    )

            else
                case ( c, rest ) of
                    ( ':', '-' :: more ) ->
                        tokenize more (TSym ":-" :: acc)

                    ( '?', '-' :: more ) ->
                        tokenize more (TSym "?-" :: acc)

                    ( '!', '=' :: more ) ->
                        tokenize more (TSym "!=" :: acc)

                    ( '<', '=' :: more ) ->
                        tokenize more (TSym "<=" :: acc)

                    ( '>', '=' :: more ) ->
                        tokenize more (TSym ">=" :: acc)

                    _ ->
                        if String.contains (String.fromChar c) "(),.=<>" then
                            tokenize rest (TSym (String.fromChar c) :: acc)

                        else
                            Err ("unexpected character " ++ String.fromChar c)


span : (Char -> Bool) -> List Char -> ( List Char, List Char )
span p cs =
    spanHelp p cs []


spanHelp : (Char -> Bool) -> List Char -> List Char -> ( List Char, List Char )
spanHelp p cs acc =
    case cs of
        c :: rest ->
            if p c then
                spanHelp p rest (c :: acc)

            else
                ( List.reverse acc, cs )

        [] ->
            ( List.reverse acc, [] )


dropWhile : (Char -> Bool) -> List Char -> List Char
dropWhile p cs =
    case cs of
        c :: rest ->
            if p c then
                dropWhile p rest

            else
                cs

        [] ->
            []



-- PARSER


type alias P a =
    List Tok -> Result String ( a, List Tok )


expect : String -> List Tok -> Result String (List Tok)
expect sym ts =
    case ts of
        (TSym s) :: rest ->
            if s == sym then
                Ok rest

            else
                Err ("expected " ++ sym ++ ", found " ++ s)

        _ ->
            Err ("expected " ++ sym)


term : P Term
term ts =
    case ts of
        (TVar v) :: rest ->
            Ok ( Var v, rest )

        (TStr s) :: rest ->
            Ok ( Val (S s), rest )

        (TNum n) :: rest ->
            Ok ( Val (N n), rest )

        _ ->
            Err "expected a variable, a \"string\" or a number"


terms : List Term -> P (List Term)
terms acc ts =
    term ts
        |> Result.andThen
            (\( t, rest ) ->
                case rest of
                    (TSym ",") :: more ->
                        terms (t :: acc) more

                    _ ->
                        expect ")" rest |> Result.map (\r -> ( List.reverse (t :: acc), r ))
            )


atom : P Atom
atom ts =
    case ts of
        (TName n) :: (TSym "(") :: (TSym ")") :: rest ->
            Ok ( Atom n [], rest )

        (TName n) :: (TSym "(") :: rest ->
            terms [] rest |> Result.map (\( args, r ) -> ( Atom n args, r ))

        (TName n) :: rest ->
            Ok ( Atom n [], rest )

        _ ->
            Err "expected a predicate such as repo(R)"


ops : List ( String, Op )
ops =
    [ ( "=", Eq ), ( "!=", Ne ), ( "<", Lt ), ( "<=", Le ), ( ">", Gt ), ( ">=", Ge ) ]


lit : P Lit
lit ts =
    case ts of
        (TName _) :: _ ->
            atom ts |> Result.map (Tuple.mapFirst Pos)

        _ ->
            term ts
                |> Result.andThen
                    (\( x, rest ) ->
                        case rest of
                            (TSym s) :: more ->
                                case List.filter (\( k, _ ) -> k == s) ops |> List.head of
                                    Just ( _, op ) ->
                                        term more |> Result.map (\( y, r ) -> ( Cmp op x y, r ))

                                    Nothing ->
                                        Err ("expected a comparison, found " ++ s)

                            _ ->
                                Err "expected a comparison"
                    )


lits : List Lit -> P (List Lit)
lits acc ts =
    lit ts
        |> Result.andThen
            (\( l, rest ) ->
                case rest of
                    (TSym ",") :: more ->
                        lits (l :: acc) more

                    _ ->
                        expect "." rest |> Result.map (\r -> ( List.reverse (l :: acc), r ))
            )


clauses : List Rule -> Maybe Atom -> List Tok -> Result String Program
clauses rules query ts =
    case ts of
        [] ->
            case query of
                Just q ->
                    Ok { rules = List.reverse rules, query = q }

                Nothing ->
                    Err "the program needs a query, such as ?- repo(R)."

        (TSym "?-") :: rest ->
            atom rest
                |> Result.andThen (\( q, r ) -> expect "." r |> Result.map (Tuple.pair q))
                |> Result.andThen (\( q, r ) -> clauses rules (Just q) r)

        _ ->
            atom ts
                |> Result.andThen
                    (\( h, rest ) ->
                        case rest of
                            (TSym ":-") :: more ->
                                lits [] more |> Result.map (\( body, r ) -> ( Rule h body, r ))

                            _ ->
                                expect "." rest |> Result.map (\r -> ( Rule h [], r ))
                    )
                |> Result.andThen (\( rule, r ) -> clauses (rule :: rules) query r)


{-| Reads a program; the error names the clause that failed.
-}
parse : String -> Result String Program
parse src =
    tokenize (String.toList src) []
        |> Result.andThen (clauses [] Nothing)
