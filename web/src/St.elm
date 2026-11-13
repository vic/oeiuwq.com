module St exposing
    ( Image
    , Machine
    , Val(..)
    , boot
    , classDefinition
    , collect
    , compile
    , decodeImage
    , doIt
    , encodeImage
    , methodSource
    , printIt
    , selectors
    , userClasses
    )

{-| A small Smalltalk: parser, interpreter and image.

It has the Smalltalk-80 syntax (unary, binary and keyword messages,
cascades, blocks with non-local return, literal and brace arrays), classes
made with `subclass:instanceVariableNames:`, methods added with `compile:`
(also to built-in classes such as Integer), and a Transcript. The image
that persists is the classes and the source of their methods.

-}

import Array exposing (Array)
import Dict exposing (Dict)
import Json.Decode as D
import Json.Encode as E



-- VALUES


type Val
    = VNil
    | VTrue
    | VFalse
    | VInt Int
    | VFloat Float
    | VStr String
    | VSym String
    | VChar Char
    | VClass String
    | VSys String
    | VRef Int


type Obj
    = OArray (Array Val)
    | OInst String (Dict String Val)
    | OBlock Block


type alias Block =
    { params : List String, temps : List String, body : List Stmt, env : Int, home : Int, self : Val, cls : String }


type alias Method =
    { selector : String, params : List String, temps : List String, body : List Stmt, source : String }


type alias Class =
    { name : String, super : Maybe String, ivars : List String, methods : Dict String Method, builtin : Bool }


type alias Env =
    { vars : Dict String Val, parent : Maybe Int }


type alias Machine =
    { heap : Dict Int Obj
    , envs : Dict Int Env
    , next : Int
    , globals : Dict String Val
    , classes : Dict String Class
    , transcript : String
    , fuel : Int
    , limit : Int
    }



-- AST


type Expr
    = Lit Val
    | LitArray (List Expr)
    | Brace (List Expr)
    | Var String
    | Assign String Expr
    | Send Expr String (List Expr)
    | Cascade Expr (List ( String, List Expr ))
    | BlockE (List String) (List String) (List Stmt)


type Stmt
    = Do Expr
    | Return Expr



-- TOKENS


type Tok
    = TId String
    | TKw String
    | TBin String
    | TInt Int
    | TFloat Float
    | TStr String
    | TSym String
    | TChar Char
    | TAssign
    | TCaret
    | TDot
    | TSemi
    | TLParen
    | TRParen
    | TLBrack
    | TRBrack
    | TLBrace
    | TRBrace
    | THashParen
    | TBar
    | TColon


binChars : String
binChars =
    "+-*/\\<>=~,@%&?!"


tokenize : List Char -> List Tok -> Result String (List Tok)
tokenize cs acc =
    case cs of
        [] ->
            Ok (List.reverse acc)

        c :: rest ->
            if c == ' ' || c == '\n' || c == '\t' || c == '\u{000D}' then
                tokenize rest acc

            else if c == '"' then
                case dropUntil '"' rest of
                    Just after ->
                        tokenize after acc

                    Nothing ->
                        Err "a comment has no closing \""

            else if c == '\'' then
                stringLit rest [] |> Result.andThen (\( s, after ) -> tokenize after (TStr s :: acc))

            else if c == '$' then
                case rest of
                    ch :: after ->
                        tokenize after (TChar ch :: acc)

                    [] ->
                        Err "$ needs a character"

            else if c == '#' then
                case rest of
                    '(' :: after ->
                        tokenize after (THashParen :: acc)

                    '\'' :: after ->
                        stringLit after [] |> Result.andThen (\( s, more ) -> tokenize more (TSym s :: acc))

                    _ ->
                        let
                            ( w, after ) =
                                span (\x -> Char.isAlphaNum x || x == ':' || x == '_') rest
                        in
                        if List.isEmpty w then
                            let
                                ( op, more ) =
                                    span (\x -> String.contains (String.fromChar x) binChars) rest
                            in
                            if List.isEmpty op then
                                Err "# needs a symbol"

                            else
                                tokenize more (TSym (String.fromList op) :: acc)

                        else
                            tokenize after (TSym (String.fromList w) :: acc)

            else if Char.isDigit c then
                let
                    ( ds, after ) =
                        span Char.isDigit rest
                in
                case after of
                    '.' :: d :: more ->
                        if Char.isDigit d then
                            let
                                ( fs, after2 ) =
                                    span Char.isDigit (d :: more)
                            in
                            case String.toFloat (String.fromList (c :: ds ++ '.' :: fs)) of
                                Just f ->
                                    tokenize after2 (TFloat f :: acc)

                                Nothing ->
                                    Err "bad number"

                        else
                            intTok (c :: ds) after acc

                    _ ->
                        intTok (c :: ds) after acc

            else if Char.isAlpha c || c == '_' then
                let
                    ( w, after ) =
                        span (\x -> Char.isAlphaNum x || x == '_') rest

                    word =
                        String.fromList (c :: w)
                in
                case after of
                    ':' :: '=' :: _ ->
                        tokenize after (TId word :: acc)

                    ':' :: more ->
                        tokenize more (TKw (word ++ ":") :: acc)

                    _ ->
                        tokenize after (TId word :: acc)

            else
                case ( c, rest ) of
                    ( ':', '=' :: more ) ->
                        tokenize more (TAssign :: acc)

                    ( ':', _ ) ->
                        tokenize rest (TColon :: acc)

                    ( '^', _ ) ->
                        tokenize rest (TCaret :: acc)

                    ( '.', _ ) ->
                        tokenize rest (TDot :: acc)

                    ( ';', _ ) ->
                        tokenize rest (TSemi :: acc)

                    ( '(', _ ) ->
                        tokenize rest (TLParen :: acc)

                    ( ')', _ ) ->
                        tokenize rest (TRParen :: acc)

                    ( '[', _ ) ->
                        tokenize rest (TLBrack :: acc)

                    ( ']', _ ) ->
                        tokenize rest (TRBrack :: acc)

                    ( '{', _ ) ->
                        tokenize rest (TLBrace :: acc)

                    ( '}', _ ) ->
                        tokenize rest (TRBrace :: acc)

                    ( '|', _ ) ->
                        tokenize rest (TBar :: acc)

                    _ ->
                        if String.contains (String.fromChar c) binChars then
                            let
                                ( op, more ) =
                                    span (\x -> String.contains (String.fromChar x) binChars) rest
                            in
                            tokenize more (TBin (String.fromList (c :: op)) :: acc)

                        else
                            Err ("unexpected character " ++ String.fromChar c)


intTok : List Char -> List Char -> List Tok -> Result String (List Tok)
intTok ds after acc =
    case String.toInt (String.fromList ds) of
        Just n ->
            tokenize after (TInt n :: acc)

        Nothing ->
            Err "bad number"


{-| A string literal; '' inside it is one quote.
-}
stringLit : List Char -> List Char -> Result String ( String, List Char )
stringLit cs acc =
    case cs of
        '\'' :: '\'' :: rest ->
            stringLit rest ('\'' :: acc)

        '\'' :: rest ->
            Ok ( String.fromList (List.reverse acc), rest )

        c :: rest ->
            stringLit rest (c :: acc)

        [] ->
            Err "a string has no closing '"


dropUntil : Char -> List Char -> Maybe (List Char)
dropUntil stop cs =
    case cs of
        c :: rest ->
            if c == stop then
                Just rest

            else
                dropUntil stop rest

        [] ->
            Nothing


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



-- PARSER


type alias P a =
    List Tok -> Result String ( a, List Tok )


temps : P (List String)
temps ts =
    case ts of
        TBar :: rest ->
            let
                go names r =
                    case r of
                        (TId n) :: more ->
                            go (n :: names) more

                        TBar :: more ->
                            Ok ( List.reverse names, more )

                        _ ->
                            Err "temporaries end with |"
            in
            go [] rest

        _ ->
            Ok ( [], ts )


{-| Statements up to the end of input or a `]`.
-}
statements : P (List Stmt)
statements ts =
    let
        go acc r =
            case r of
                [] ->
                    Ok ( List.reverse acc, [] )

                TRBrack :: _ ->
                    Ok ( List.reverse acc, r )

                TRBrace :: _ ->
                    Ok ( List.reverse acc, r )

                TDot :: more ->
                    go acc more

                TCaret :: more ->
                    expr more |> Result.andThen (\( e, after ) -> go (Return e :: acc) after)

                _ ->
                    expr r
                        |> Result.andThen
                            (\( e, after ) ->
                                case after of
                                    TDot :: more ->
                                        go (Do e :: acc) more

                                    _ ->
                                        go (Do e :: acc) after |> Result.andThen (checkEnd after)
                            )
    in
    go [] ts


checkEnd : List Tok -> ( List Stmt, List Tok ) -> Result String ( List Stmt, List Tok )
checkEnd after res =
    case after of
        [] ->
            Ok res

        TRBrack :: _ ->
            Ok res

        TRBrace :: _ ->
            Ok res

        t :: _ ->
            Err ("expected a period before " ++ tokText t)


tokText : Tok -> String
tokText t =
    case t of
        TId s ->
            s

        TKw s ->
            s

        TBin s ->
            s

        TInt n ->
            String.fromInt n

        TStr s ->
            "'" ++ s ++ "'"

        TSym s ->
            "#" ++ s

        _ ->
            "this"


expr : P Expr
expr ts =
    case ts of
        (TId n) :: TAssign :: rest ->
            expr rest |> Result.map (Tuple.mapFirst (Assign n))

        _ ->
            keywordExpr ts
                |> Result.andThen
                    (\( e, rest ) ->
                        case ( rest, e ) of
                            ( TSemi :: _, Send recv sel args ) ->
                                cascade recv [ ( sel, args ) ] rest

                            ( TSemi :: _, _ ) ->
                                Err "a cascade needs a message before ;"

                            _ ->
                                Ok ( e, rest )
                    )


cascade : Expr -> List ( String, List Expr ) -> P Expr
cascade recv msgs ts =
    case ts of
        TSemi :: rest ->
            message rest |> Result.andThen (\( m, after ) -> cascade recv (m :: msgs) after)

        _ ->
            Ok ( Cascade recv (List.reverse msgs), ts )


{-| One message without its receiver, for cascades.
-}
message : P ( String, List Expr )
message ts =
    case ts of
        (TId sel) :: rest ->
            Ok ( ( sel, [] ), rest )

        (TBin op) :: rest ->
            unaryExpr rest |> Result.map (\( arg, r ) -> ( ( op, [ arg ] ), r ))

        (TKw _) :: _ ->
            keywordParts [] [] ts |> Result.map (\( ( sel, args ), r ) -> ( ( sel, args ), r ))

        _ ->
            Err "expected a message after ;"


keywordParts : List String -> List Expr -> P ( String, List Expr )
keywordParts kws args ts =
    case ts of
        (TKw k) :: rest ->
            binaryExpr rest |> Result.andThen (\( a, r ) -> keywordParts (k :: kws) (a :: args) r)

        _ ->
            Ok ( ( String.concat (List.reverse kws), List.reverse args ), ts )


keywordExpr : P Expr
keywordExpr ts =
    binaryExpr ts
        |> Result.andThen
            (\( recv, rest ) ->
                case rest of
                    (TKw _) :: _ ->
                        keywordParts [] [] rest |> Result.map (\( ( sel, args ), r ) -> ( Send recv sel args, r ))

                    _ ->
                        Ok ( recv, rest )
            )


binaryExpr : P Expr
binaryExpr ts =
    let
        go recv r =
            case r of
                (TBin op) :: more ->
                    unaryExpr more |> Result.andThen (\( arg, after ) -> go (Send recv op [ arg ]) after)

                TBar :: more ->
                    unaryExpr more |> Result.andThen (\( arg, after ) -> go (Send recv "|" [ arg ]) after)

                _ ->
                    Ok ( recv, r )
    in
    unaryExpr ts |> Result.andThen (\( e, r ) -> go e r)


unaryExpr : P Expr
unaryExpr ts =
    let
        go recv r =
            case r of
                (TId sel) :: more ->
                    go (Send recv sel []) more

                _ ->
                    Ok ( recv, r )
    in
    primary ts |> Result.andThen (\( e, r ) -> go e r)


primary : P Expr
primary ts =
    case ts of
        (TId n) :: rest ->
            Ok
                ( case n of
                    "nil" ->
                        Lit VNil

                    "true" ->
                        Lit VTrue

                    "false" ->
                        Lit VFalse

                    _ ->
                        Var n
                , rest
                )

        (TInt n) :: rest ->
            Ok ( Lit (VInt n), rest )

        (TFloat f) :: rest ->
            Ok ( Lit (VFloat f), rest )

        (TBin "-") :: (TInt n) :: rest ->
            Ok ( Lit (VInt (negate n)), rest )

        (TBin "-") :: (TFloat f) :: rest ->
            Ok ( Lit (VFloat (negate f)), rest )

        (TStr s) :: rest ->
            Ok ( Lit (VStr s), rest )

        (TSym s) :: rest ->
            Ok ( Lit (VSym s), rest )

        (TChar c) :: rest ->
            Ok ( Lit (VChar c), rest )

        TLParen :: rest ->
            expr rest
                |> Result.andThen
                    (\( e, r ) ->
                        case r of
                            TRParen :: more ->
                                Ok ( e, more )

                            _ ->
                                Err "expected )"
                    )

        TLBrack :: rest ->
            block rest

        THashParen :: rest ->
            literalArray [] rest

        TLBrace :: rest ->
            statements rest
                |> Result.andThen
                    (\( stmts, r ) ->
                        case r of
                            TRBrace :: more ->
                                Ok ( Brace (List.map stmtExpr stmts), more )

                            _ ->
                                Err "expected }"
                    )

        t :: _ ->
            Err ("unexpected " ++ tokText t)

        [] ->
            Err "unexpected end"


stmtExpr : Stmt -> Expr
stmtExpr s =
    case s of
        Do e ->
            e

        Return e ->
            e


block : P Expr
block ts =
    let
        params acc r =
            case r of
                TColon :: (TId p) :: more ->
                    params (p :: acc) more

                TBar :: more ->
                    Ok ( List.reverse acc, more )

                TRBrack :: _ ->
                    if List.isEmpty acc then
                        Ok ( [], r )

                    else
                        Err "block parameters end with |"

                _ ->
                    if List.isEmpty acc then
                        Ok ( [], r )

                    else
                        Err "block parameters end with |"
    in
    params [] ts
        |> Result.andThen
            (\( ps, r ) ->
                temps r
                    |> Result.andThen
                        (\( tmp, r2 ) ->
                            statements r2
                                |> Result.andThen
                                    (\( body, r3 ) ->
                                        case r3 of
                                            TRBrack :: more ->
                                                Ok ( BlockE ps tmp body, more )

                                            _ ->
                                                Err "expected ]"
                                    )
                        )
            )


literalArray : List Expr -> P Expr
literalArray acc ts =
    let
        lit v rest =
            literalArray (Lit v :: acc) rest
    in
    case ts of
        TRParen :: rest ->
            Ok ( LitArray (List.reverse acc), rest )

        (TInt n) :: rest ->
            lit (VInt n) rest

        (TBin "-") :: (TInt n) :: rest ->
            lit (VInt (negate n)) rest

        (TFloat f) :: rest ->
            lit (VFloat f) rest

        (TStr s) :: rest ->
            lit (VStr s) rest

        (TSym s) :: rest ->
            lit (VSym s) rest

        (TChar c) :: rest ->
            lit (VChar c) rest

        (TId "nil") :: rest ->
            lit VNil rest

        (TId "true") :: rest ->
            lit VTrue rest

        (TId "false") :: rest ->
            lit VFalse rest

        (TId s) :: rest ->
            lit (VSym s) rest

        (TKw s) :: rest ->
            lit (VSym s) rest

        (TBin s) :: rest ->
            lit (VSym s) rest

        TLParen :: rest ->
            literalArray [] rest |> Result.andThen (\( inner, r ) -> literalArray (inner :: acc) r)

        THashParen :: rest ->
            literalArray [] rest |> Result.andThen (\( inner, r ) -> literalArray (inner :: acc) r)

        _ ->
            Err "bad literal array"


parseDoIt : String -> Result String ( List String, List Stmt )
parseDoIt src =
    tokenize (String.toList src) []
        |> Result.andThen temps
        |> Result.andThen (\( tmp, rest ) -> statements rest |> Result.andThen (\( body, r ) -> end r ( tmp, body )))


end : List Tok -> a -> Result String a
end rest a =
    case rest of
        [] ->
            Ok a

        t :: _ ->
            Err ("unexpected " ++ tokText t)


{-| A method: its pattern (`foo`, `+ other`, `at: i put: v`), temporaries, body.
-}
parseMethod : String -> Result String Method
parseMethod src =
    tokenize (String.toList src) []
        |> Result.andThen
            (\ts ->
                (case ts of
                    (TId sel) :: rest ->
                        Ok ( sel, [], rest )

                    (TBin op) :: (TId arg) :: rest ->
                        Ok ( op, [ arg ], rest )

                    TBar :: (TId arg) :: rest ->
                        Ok ( "|", [ arg ], rest )

                    (TKw _) :: _ ->
                        let
                            go kws args r =
                                case r of
                                    (TKw k) :: (TId a) :: more ->
                                        go (k :: kws) (a :: args) more

                                    _ ->
                                        Ok ( String.concat (List.reverse kws), List.reverse args, r )
                        in
                        go [] [] ts

                    _ ->
                        Err "a method starts with its selector, such as  foo  or  at: i put: v"
                )
                    |> Result.andThen
                        (\( sel, params, rest ) ->
                            temps rest
                                |> Result.andThen (\( tmp, r ) -> statements r |> Result.andThen (\( body, r2 ) -> end r2 (Method sel params tmp body src)))
                        )
            )



-- MACHINE


builtinClasses : List ( String, Maybe String )
builtinClasses =
    [ ( "Object", Nothing )
    , ( "UndefinedObject", Just "Object" )
    , ( "Boolean", Just "Object" )
    , ( "True", Just "Boolean" )
    , ( "False", Just "Boolean" )
    , ( "Magnitude", Just "Object" )
    , ( "Number", Just "Magnitude" )
    , ( "Integer", Just "Number" )
    , ( "SmallInteger", Just "Integer" )
    , ( "Float", Just "Number" )
    , ( "Character", Just "Magnitude" )
    , ( "Collection", Just "Object" )
    , ( "ArrayedCollection", Just "Collection" )
    , ( "Array", Just "ArrayedCollection" )
    , ( "String", Just "ArrayedCollection" )
    , ( "Symbol", Just "String" )
    , ( "BlockClosure", Just "Object" )
    , ( "TranscriptStream", Just "Object" )
    , ( "SystemDictionary", Just "Object" )
    ]


{-| A fresh machine with only the built-in classes.
-}
boot : Machine
boot =
    { heap = Dict.empty
    , envs = Dict.empty
    , next = 1
    , globals = Dict.fromList [ ( "Transcript", VSys "Transcript" ), ( "Smalltalk", VSys "Smalltalk" ) ]
    , classes = Dict.fromList (List.map (\( n, s ) -> ( n, Class n s [] Dict.empty True )) builtinClasses)
    , transcript = ""
    , fuel = 0
    , limit = budget
    }


classOf : Machine -> Val -> String
classOf m v =
    case v of
        VNil ->
            "UndefinedObject"

        VTrue ->
            "True"

        VFalse ->
            "False"

        VInt _ ->
            "SmallInteger"

        VFloat _ ->
            "Float"

        VStr _ ->
            "String"

        VSym _ ->
            "Symbol"

        VChar _ ->
            "Character"

        VClass _ ->
            "Class"

        VSys "Transcript" ->
            "TranscriptStream"

        VSys _ ->
            "SystemDictionary"

        VRef r ->
            case Dict.get r m.heap of
                Just (OArray _) ->
                    "Array"

                Just (OInst c _) ->
                    c

                Just (OBlock _) ->
                    "BlockClosure"

                Nothing ->
                    "Object"


{-| The method for a selector, searching up from a class, with the class
that defines it.
-}
lookup : Machine -> String -> String -> Maybe ( String, Method )
lookup m cls sel =
    case Dict.get cls m.classes of
        Just c ->
            case Dict.get sel c.methods of
                Just meth ->
                    Just ( cls, meth )

                Nothing ->
                    c.super |> Maybe.andThen (\s -> lookup m s sel)

        Nothing ->
            Nothing


inherits : Machine -> String -> String -> Bool
inherits m cls ancestor =
    cls == ancestor || (Dict.get cls m.classes |> Maybe.andThen .super |> Maybe.map (\s -> inherits m s ancestor) |> Maybe.withDefault False)


alloc : Obj -> Machine -> ( Val, Machine )
alloc o m =
    ( VRef m.next, { m | heap = Dict.insert m.next o m.heap, next = m.next + 1 } )


newEnv : Dict String Val -> Maybe Int -> Machine -> ( Int, Machine )
newEnv vars parent m =
    ( m.next, { m | envs = Dict.insert m.next (Env vars parent) m.envs, next = m.next + 1 } )



-- EVALUATION


type Flow
    = Value Val
    | Ret Int Val
    | Fail String


type alias Ctx =
    { env : Int, self : Val, home : Int, cls : String, depth : Int }


maxDepth : Int
maxDepth =
    400


lookupVar : Ctx -> String -> Machine -> Result String Val
lookupVar ctx name m =
    let
        inEnv id =
            case Dict.get id m.envs of
                Just e ->
                    case Dict.get name e.vars of
                        Just v ->
                            Just v

                        Nothing ->
                            e.parent |> Maybe.andThen inEnv

                Nothing ->
                    Nothing
    in
    case ( name, inEnv ctx.env ) of
        ( "self", _ ) ->
            Ok ctx.self

        ( "super", _ ) ->
            Ok ctx.self

        ( "thisContext", _ ) ->
            Ok VNil

        ( _, Just v ) ->
            Ok v

        _ ->
            case ivar ctx m |> Maybe.andThen (Dict.get name) of
                Just v ->
                    Ok v

                Nothing ->
                    case Dict.get name m.globals of
                        Just v ->
                            Ok v

                        Nothing ->
                            if Dict.member name m.classes then
                                Ok (VClass name)

                            else
                                Err (name ++ " is not defined")


ivar : Ctx -> Machine -> Maybe (Dict String Val)
ivar ctx m =
    case ctx.self of
        VRef r ->
            case Dict.get r m.heap of
                Just (OInst _ fields) ->
                    Just fields

                _ ->
                    Nothing

        _ ->
            Nothing


assign : Ctx -> String -> Val -> Machine -> Machine
assign ctx name v m =
    let
        owner id =
            case Dict.get id m.envs of
                Just e ->
                    if Dict.member name e.vars then
                        Just ( id, e )

                    else
                        e.parent |> Maybe.andThen owner

                Nothing ->
                    Nothing
    in
    case owner ctx.env of
        Just ( id, e ) ->
            { m | envs = Dict.insert id { e | vars = Dict.insert name v e.vars } m.envs }

        Nothing ->
            case ( ctx.self, ivar ctx m ) of
                ( VRef r, Just fields ) ->
                    if Dict.member name fields then
                        { m | heap = Dict.insert r (OInst (classOf m ctx.self) (Dict.insert name v fields)) m.heap }

                    else
                        { m | globals = Dict.insert name v m.globals }

                _ ->
                    -- a workspace declares a new variable by assigning it
                    { m | globals = Dict.insert name v m.globals }


eval : Ctx -> Expr -> Machine -> ( Flow, Machine )
eval ctx e m =
    case e of
        Lit v ->
            ( Value v, m )

        Var n ->
            case lookupVar ctx n m of
                Ok v ->
                    ( Value v, m )

                Err msg ->
                    ( Fail msg, m )

        Assign n x ->
            case eval ctx x m of
                ( Value v, m2 ) ->
                    ( Value v, assign ctx n v m2 )

                other ->
                    other

        LitArray items ->
            evalList ctx items m |> andThenVals (\vs m2 -> alloc (OArray (Array.fromList vs)) m2 |> Tuple.mapFirst Value)

        Brace items ->
            evalList ctx items m |> andThenVals (\vs m2 -> alloc (OArray (Array.fromList vs)) m2 |> Tuple.mapFirst Value)

        BlockE ps tmp body ->
            alloc (OBlock (Block ps tmp body ctx.env ctx.home ctx.self ctx.cls)) m |> Tuple.mapFirst Value

        Send recvE sel argEs ->
            case eval ctx recvE m of
                ( Value recv, m2 ) ->
                    evalList ctx argEs m2
                        |> andThenVals
                            (\args m3 ->
                                if recvE == Var "super" then
                                    sendSuper ctx recv sel args m3

                                else
                                    send ctx recv sel args m3
                            )

                other ->
                    other

        Cascade recvE msgs ->
            case eval ctx recvE m of
                ( Value recv, m2 ) ->
                    List.foldl
                        (\( sel, argEs ) ( flow, mm ) ->
                            case flow of
                                Value _ ->
                                    evalList ctx argEs mm |> andThenVals (\args m3 -> send ctx recv sel args m3)

                                _ ->
                                    ( flow, mm )
                        )
                        ( Value VNil, m2 )
                        msgs

                other ->
                    other


andThenVals : (List Val -> Machine -> ( Flow, Machine )) -> ( Result Flow (List Val), Machine ) -> ( Flow, Machine )
andThenVals f ( r, m ) =
    case r of
        Ok vs ->
            f vs m

        Err flow ->
            ( flow, m )


evalList : Ctx -> List Expr -> Machine -> ( Result Flow (List Val), Machine )
evalList ctx es m =
    List.foldl
        (\e ( acc, mm ) ->
            case acc of
                Ok vs ->
                    case eval ctx e mm of
                        ( Value v, m2 ) ->
                            ( Ok (v :: vs), m2 )

                        ( flow, m2 ) ->
                            ( Err flow, m2 )

                Err _ ->
                    ( acc, mm )
        )
        ( Ok [], m )
        es
        |> Tuple.mapFirst (Result.map List.reverse)


evalStmts : Ctx -> List Stmt -> Machine -> ( Flow, Machine )
evalStmts ctx stmts m =
    case stmts of
        [] ->
            ( Value VNil, m )

        [ Do e ] ->
            eval ctx e m

        (Do e) :: rest ->
            case eval ctx e m of
                ( Value _, m2 ) ->
                    evalStmts ctx rest m2

                other ->
                    other

        (Return e) :: _ ->
            case eval ctx e m of
                ( Value v, m2 ) ->
                    ( Ret ctx.home v, m2 )

                other ->
                    other


send : Ctx -> Val -> String -> List Val -> Machine -> ( Flow, Machine )
send ctx recv sel args m =
    if m.fuel <= 0 then
        ( Fail "out of steps: the code ran too long", m )

    else if ctx.depth > maxDepth then
        ( Fail "stack overflow: too many nested sends", m )

    else
        let
            m1 =
                { m | fuel = m.fuel - 1 }
        in
        case lookup m1 (classOf m1 recv) sel of
            Just ( defining, meth ) ->
                invoke ctx defining meth recv args m1

            Nothing ->
                primitive ctx recv sel args m1


sendSuper : Ctx -> Val -> String -> List Val -> Machine -> ( Flow, Machine )
sendSuper ctx recv sel args m =
    case Dict.get ctx.cls m.classes |> Maybe.andThen .super |> Maybe.andThen (\s -> lookup m s sel) of
        Just ( defining, meth ) ->
            invoke ctx defining meth recv args { m | fuel = m.fuel - 1 }

        Nothing ->
            primitive ctx recv sel args m


invoke : Ctx -> String -> Method -> Val -> List Val -> Machine -> ( Flow, Machine )
invoke ctx defining meth recv args m =
    if List.length args /= List.length meth.params then
        ( Fail ("#" ++ meth.selector ++ " takes " ++ String.fromInt (List.length meth.params) ++ " arguments"), m )

    else
        let
            ( env, m2 ) =
                newEnv (Dict.fromList (List.map2 Tuple.pair meth.params args ++ List.map (\t -> ( t, VNil )) meth.temps)) Nothing m

            inner =
                { env = env, self = recv, home = env, cls = defining, depth = ctx.depth + 1 }
        in
        case evalStmts inner meth.body m2 of
            ( Ret h v, m3 ) ->
                if h == env then
                    ( Value v, m3 )

                else
                    ( Ret h v, m3 )

            ( Value _, m3 ) ->
                ( Value recv, m3 )

            other ->
                other


callBlock : Ctx -> Val -> List Val -> Machine -> ( Flow, Machine )
callBlock ctx bv args m =
    case bv of
        VRef r ->
            case Dict.get r m.heap of
                Just (OBlock b) ->
                    if List.length args /= List.length b.params then
                        ( Fail ("this block takes " ++ String.fromInt (List.length b.params) ++ " arguments, not " ++ String.fromInt (List.length args)), m )

                    else if m.fuel <= 0 then
                        ( Fail "out of steps: the code ran too long", m )

                    else
                        let
                            ( env, m2 ) =
                                newEnv (Dict.fromList (List.map2 Tuple.pair b.params args ++ List.map (\t -> ( t, VNil )) b.temps)) (Just b.env) { m | fuel = m.fuel - 1 }
                        in
                        evalStmts { env = env, self = b.self, home = b.home, cls = b.cls, depth = ctx.depth + 1 } b.body m2

                _ ->
                    ( Fail "not a block", m )

        _ ->
            ( Fail "not a block", m )



-- PRIMITIVES


ok : Val -> Machine -> ( Flow, Machine )
ok v m =
    ( Value v, m )


bool : Bool -> Val
bool b =
    if b then
        VTrue

    else
        VFalse


dnu : Machine -> Val -> String -> ( Flow, Machine )
dnu m recv sel =
    ( Fail (printString m recv ++ " doesNotUnderstand: #" ++ sel), m )


primitive : Ctx -> Val -> String -> List Val -> Machine -> ( Flow, Machine )
primitive ctx recv sel args m =
    case ( recv, sel, args ) of
        ( _, "==", [ x ] ) ->
            ok (bool (recv == x)) m

        ( _, "~~", [ x ] ) ->
            ok (bool (recv /= x)) m

        ( _, "=", [ x ] ) ->
            ok (bool (equal m recv x)) m

        ( _, "~=", [ x ] ) ->
            ok (bool (not (equal m recv x))) m

        ( _, "class", [] ) ->
            ok (VClass (classOf m recv)) m

        ( _, "printString", [] ) ->
            ok (VStr (printString m recv)) m

        ( _, "displayString", [] ) ->
            ok (VStr (displayString m recv)) m

        ( _, "printNl", [] ) ->
            ok recv { m | transcript = m.transcript ++ printString m recv ++ "\n" }

        ( _, "displayNl", [] ) ->
            ok recv { m | transcript = m.transcript ++ displayString m recv ++ "\n" }

        ( _, "yourself", [] ) ->
            ok recv m

        ( _, "isNil", [] ) ->
            ok (bool (recv == VNil)) m

        ( _, "notNil", [] ) ->
            ok (bool (recv /= VNil)) m

        ( VNil, "ifNil:", [ b ] ) ->
            callBlock ctx b [] m

        ( _, "ifNil:", [ _ ] ) ->
            ok recv m

        ( VNil, "ifNotNil:", [ _ ] ) ->
            ok VNil m

        ( _, "ifNotNil:", [ b ] ) ->
            callBlock ctx b (blockArgs m b [ recv ]) m

        ( VNil, "ifNil:ifNotNil:", [ b, _ ] ) ->
            callBlock ctx b [] m

        ( _, "ifNil:ifNotNil:", [ _, b ] ) ->
            callBlock ctx b (blockArgs m b [ recv ]) m

        ( _, "respondsTo:", [ VSym s ] ) ->
            ok (bool (lookup m (classOf m recv) s /= Nothing || List.member s (primitiveSelectors m recv))) m

        ( _, "isKindOf:", [ VClass c ] ) ->
            ok (bool (inherits m (classOf m recv) c)) m

        ( _, "->", [ x ] ) ->
            alloc (OArray (Array.fromList [ recv, x ])) m |> Tuple.mapFirst Value

        ( VTrue, _, _ ) ->
            boolean ctx True sel args m

        ( VFalse, _, _ ) ->
            boolean ctx False sel args m

        ( VInt a, _, _ ) ->
            number ctx (toFloat a) (Just a) sel args m

        ( VFloat a, _, _ ) ->
            number ctx a Nothing sel args m

        ( VStr s, _, _ ) ->
            string ctx VStr s sel args m

        ( VSym s, _, _ ) ->
            string ctx VSym s sel args m

        ( VChar c, _, _ ) ->
            character c sel args m

        ( VClass c, _, _ ) ->
            classMsg c sel args m

        ( VSys "Transcript", _, _ ) ->
            transcript recv sel args m

        ( VSys _, _, _ ) ->
            smalltalk recv sel args m

        ( VRef r, _, _ ) ->
            case Dict.get r m.heap of
                Just (OArray a) ->
                    array ctx r a sel args m

                Just (OBlock _) ->
                    blockMsg ctx recv sel args m

                _ ->
                    dnu m recv sel

        _ ->
            dnu m recv sel


{-| The arguments a block wants: `ifNotNil: [:x | ...]` passes x, `[...]` nothing.
-}
blockArgs : Machine -> Val -> List Val -> List Val
blockArgs m b vals =
    case b of
        VRef r ->
            case Dict.get r m.heap of
                Just (OBlock blk) ->
                    List.take (List.length blk.params) vals

                _ ->
                    vals

        _ ->
            vals


primitiveSelectors : Machine -> Val -> List String
primitiveSelectors _ _ =
    [ "printString", "displayString", "class", "=", "==" ]


equal : Machine -> Val -> Val -> Bool
equal m a b =
    case ( a, b ) of
        ( VInt x, VFloat y ) ->
            toFloat x == y

        ( VFloat x, VInt y ) ->
            x == toFloat y

        ( VRef x, VRef y ) ->
            case ( Dict.get x m.heap, Dict.get y m.heap ) of
                ( Just (OArray p), Just (OArray q) ) ->
                    Array.length p == Array.length q && List.all identity (List.map2 (equal m) (Array.toList p) (Array.toList q))

                _ ->
                    x == y

        _ ->
            a == b


boolean : Ctx -> Bool -> String -> List Val -> Machine -> ( Flow, Machine )
boolean ctx b sel args m =
    case ( sel, args ) of
        ( "ifTrue:", [ t ] ) ->
            if b then
                callBlock ctx t [] m

            else
                ok VNil m

        ( "ifFalse:", [ f ] ) ->
            if b then
                ok VNil m

            else
                callBlock ctx f [] m

        ( "ifTrue:ifFalse:", [ t, f ] ) ->
            callBlock ctx
                (if b then
                    t

                 else
                    f
                )
                []
                m

        ( "ifFalse:ifTrue:", [ f, t ] ) ->
            callBlock ctx
                (if b then
                    t

                 else
                    f
                )
                []
                m

        ( "not", [] ) ->
            ok (bool (not b)) m

        ( "&", [ x ] ) ->
            ok (bool (b && x == VTrue)) m

        ( "|", [ x ] ) ->
            ok (bool (b || x == VTrue)) m

        ( "and:", [ x ] ) ->
            if b then
                callBlock ctx x [] m

            else
                ok VFalse m

        ( "or:", [ x ] ) ->
            if b then
                ok VTrue m

            else
                callBlock ctx x [] m

        _ ->
            dnu m (bool b) sel


numVal : Val -> Maybe ( Float, Maybe Int )
numVal v =
    case v of
        VInt n ->
            Just ( toFloat n, Just n )

        VFloat f ->
            Just ( f, Nothing )

        _ ->
            Nothing


{-| A float that holds a whole number stays a float: 2.0, not 2.
-}
num : Maybe Int -> Maybe Int -> (Int -> Int -> Int) -> (Float -> Float -> Float) -> Float -> Float -> Val
num ia ib fi ff a b =
    case ( ia, ib ) of
        ( Just x, Just y ) ->
            VInt (fi x y)

        _ ->
            VFloat (ff a b)


number : Ctx -> Float -> Maybe Int -> String -> List Val -> Machine -> ( Flow, Machine )
number ctx a ia sel args m =
    let
        self =
            Maybe.map VInt ia |> Maybe.withDefault (VFloat a)

        arith fi ff =
            case args of
                [ x ] ->
                    case numVal x of
                        Just ( b, ib ) ->
                            ok (num ia ib fi ff a b) m

                        Nothing ->
                            ( Fail (printString m x ++ " is not a number"), m )

                _ ->
                    dnu m self sel

        cmp f =
            case args of
                [ x ] ->
                    case numVal x of
                        Just ( b, _ ) ->
                            ok (bool (f a b)) m

                        Nothing ->
                            ( Fail (printString m x ++ " is not a number"), m )

                _ ->
                    dnu m self sel

        int f =
            case ia of
                Just n ->
                    f n

                Nothing ->
                    dnu m self sel

        loop from to by blk mm =
            if (by > 0 && from > to) || (by < 0 && from < to) then
                ( Value self, mm )

            else
                case callBlock ctx blk [ VInt from ] mm of
                    ( Value _, m2 ) ->
                        loop (from + by) to by blk m2

                    other ->
                        other
    in
    case ( sel, args ) of
        ( "+", _ ) ->
            arith (+) (+)

        ( "-", _ ) ->
            arith (-) (-)

        ( "*", _ ) ->
            arith (*) (*)

        ( "/", [ x ] ) ->
            case ( ia, x ) of
                ( _, VInt 0 ) ->
                    ( Fail "ZeroDivide", m )

                ( Just p, VInt q ) ->
                    if modBy q p == 0 then
                        ok (VInt (p // q)) m

                    else
                        ok (VFloat (toFloat p / toFloat q)) m

                _ ->
                    arith (//) (/)

        ( "//", [ VInt 0 ] ) ->
            ( Fail "ZeroDivide", m )

        ( "//", _ ) ->
            arith (//) (\p q -> toFloat (floor (p / q)))

        ( "\\\\", [ VInt 0 ] ) ->
            ( Fail "ZeroDivide", m )

        ( "\\\\", _ ) ->
            arith (\p q -> modBy q p) (\p q -> p - q * toFloat (floor (p / q)))

        ( "<", _ ) ->
            cmp (<)

        ( ">", _ ) ->
            cmp (>)

        ( "<=", _ ) ->
            cmp (<=)

        ( ">=", _ ) ->
            cmp (>=)

        ( "max:", _ ) ->
            arith Basics.max Basics.max

        ( "min:", _ ) ->
            arith Basics.min Basics.min

        ( "between:and:", [ lo, hi ] ) ->
            case ( numVal lo, numVal hi ) of
                ( Just ( l, _ ), Just ( h, _ ) ) ->
                    ok (bool (l <= a && a <= h)) m

                _ ->
                    ( Fail "between:and: needs numbers", m )

        ( "abs", [] ) ->
            ok (Maybe.map (abs >> VInt) ia |> Maybe.withDefault (VFloat (abs a))) m

        ( "negated", [] ) ->
            ok (Maybe.map (negate >> VInt) ia |> Maybe.withDefault (VFloat (negate a))) m

        ( "squared", [] ) ->
            ok (Maybe.map (\n -> VInt (n * n)) ia |> Maybe.withDefault (VFloat (a * a))) m

        ( "sqrt", [] ) ->
            ok (VFloat (sqrt a)) m

        ( "asFloat", [] ) ->
            ok (VFloat a) m

        ( "asInteger", [] ) ->
            ok (VInt (truncate a)) m

        ( "truncated", [] ) ->
            ok (VInt (truncate a)) m

        ( "rounded", [] ) ->
            ok (VInt (round a)) m

        ( "isZero", [] ) ->
            ok (bool (a == 0)) m

        ( "even", [] ) ->
            int (\n -> ok (bool (modBy 2 n == 0)) m)

        ( "odd", [] ) ->
            int (\n -> ok (bool (modBy 2 n == 1)) m)

        ( "isPrime", [] ) ->
            int (\n -> ok (bool (n > 1 && List.all (\d -> modBy d n /= 0) (List.range 2 (floor (sqrt (toFloat n)))))) m)

        ( "factorial", [] ) ->
            int (\n -> ok (VInt (List.product (List.range 1 n))) m)

        ( "gcd:", [ VInt b ] ) ->
            int (\n -> ok (VInt (gcd (abs n) (abs b))) m)

        ( "asCharacter", [] ) ->
            int (\n -> ok (VChar (Char.fromCode n)) m)

        ( "printString:", [ VInt base ] ) ->
            int (\n -> ok (VStr (radix base n)) m)

        ( "timesRepeat:", [ blk ] ) ->
            int (\n -> loop 1 n 1 blk m)

        ( "to:do:", [ VInt to, blk ] ) ->
            int (\n -> loop n to 1 blk m)

        ( "to:by:do:", [ VInt to, VInt by, blk ] ) ->
            if by == 0 then
                ( Fail "to:by:do: needs a step other than 0", m )

            else
                int (\n -> loop n to by blk m)

        ( "to:", [ VInt to ] ) ->
            int (\n -> alloc (OArray (Array.fromList (List.map VInt (List.range n to)))) m |> Tuple.mapFirst Value)

        ( "@", [ y ] ) ->
            alloc (OArray (Array.fromList [ self, y ])) m |> Tuple.mapFirst Value

        _ ->
            dnu m self sel


gcd : Int -> Int -> Int
gcd a b =
    if b == 0 then
        a

    else
        gcd b (modBy b a)


radix : Int -> Int -> String
radix base n =
    if base < 2 || base > 36 then
        String.fromInt n

    else if n < 0 then
        "-" ++ radix base (negate n)

    else if n < base then
        String.slice n (n + 1) "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    else
        radix base (n // base) ++ radix base (modBy base n)


string : Ctx -> (String -> Val) -> String -> String -> List Val -> Machine -> ( Flow, Machine )
string ctx wrap s sel args m =
    let
        chars =
            String.toList s
    in
    case ( sel, args ) of
        ( ",", [ x ] ) ->
            case x of
                VStr t ->
                    ok (VStr (s ++ t)) m

                VSym t ->
                    ok (VStr (s ++ t)) m

                _ ->
                    ( Fail ("cannot concatenate " ++ printString m x ++ " to a string: send it displayString first"), m )

        ( "size", [] ) ->
            ok (VInt (String.length s)) m

        ( "at:", [ VInt i ] ) ->
            case List.drop (i - 1) chars |> List.head of
                Just c ->
                    if i >= 1 then
                        ok (VChar c) m

                    else
                        ( Fail ("index " ++ String.fromInt i ++ " is out of bounds"), m )

                Nothing ->
                    ( Fail ("index " ++ String.fromInt i ++ " is out of bounds"), m )

        ( "reversed", [] ) ->
            ok (wrap (String.reverse s)) m

        ( "reverse", [] ) ->
            ok (wrap (String.reverse s)) m

        ( "asUppercase", [] ) ->
            ok (wrap (String.toUpper s)) m

        ( "asLowercase", [] ) ->
            ok (wrap (String.toLower s)) m

        ( "asSymbol", [] ) ->
            ok (VSym s) m

        ( "asString", [] ) ->
            ok (VStr s) m

        ( "asNumber", [] ) ->
            ok (String.toInt s |> Maybe.map VInt |> Maybe.withDefault (String.toFloat s |> Maybe.map VFloat |> Maybe.withDefault VNil)) m

        ( "asInteger", [] ) ->
            ok (String.toInt s |> Maybe.map VInt |> Maybe.withDefault VNil) m

        ( "isEmpty", [] ) ->
            ok (bool (s == "")) m

        ( "notEmpty", [] ) ->
            ok (bool (s /= "")) m

        ( "includesSubstring:", [ VStr t ] ) ->
            ok (bool (String.contains t s)) m

        ( "occurrencesOf:", [ VChar c ] ) ->
            ok (VInt (List.length (List.filter ((==) c) chars))) m

        ( "<", [ VStr t ] ) ->
            ok (bool (s < t)) m

        ( ">", [ VStr t ] ) ->
            ok (bool (s > t)) m

        ( "do:", [ blk ] ) ->
            each ctx blk (List.map VChar chars) (VStr s) m

        ( "asArray", [] ) ->
            alloc (OArray (Array.fromList (List.map VChar chars))) m |> Tuple.mapFirst Value

        ( "substrings", [] ) ->
            alloc (OArray (Array.fromList (List.map VStr (String.words s)))) m |> Tuple.mapFirst Value

        ( "lines", [] ) ->
            alloc (OArray (Array.fromList (List.map VStr (String.lines s)))) m |> Tuple.mapFirst Value

        _ ->
            dnu m (wrap s) sel


character : Char -> String -> List Val -> Machine -> ( Flow, Machine )
character c sel args m =
    case ( sel, args ) of
        ( "asInteger", [] ) ->
            ok (VInt (Char.toCode c)) m

        ( "value", [] ) ->
            ok (VInt (Char.toCode c)) m

        ( "asUppercase", [] ) ->
            ok (VChar (Char.toUpper c)) m

        ( "asLowercase", [] ) ->
            ok (VChar (Char.toLower c)) m

        ( "isVowel", [] ) ->
            ok (bool (String.contains (String.fromChar (Char.toLower c)) "aeiou")) m

        ( "isLetter", [] ) ->
            ok (bool (Char.isAlpha c)) m

        ( "isDigit", [] ) ->
            ok (bool (Char.isDigit c)) m

        ( "asString", [] ) ->
            ok (VStr (String.fromChar c)) m

        ( "<", [ VChar d ] ) ->
            ok (bool (c < d)) m

        ( ">", [ VChar d ] ) ->
            ok (bool (c > d)) m

        _ ->
            dnu m (VChar c) sel


each : Ctx -> Val -> List Val -> Val -> Machine -> ( Flow, Machine )
each ctx blk vals result m =
    case vals of
        [] ->
            ( Value result, m )

        v :: rest ->
            case callBlock ctx blk [ v ] m of
                ( Value _, m2 ) ->
                    each ctx blk rest result m2

                other ->
                    other


{-| Calls a block on each value and keeps the answers.
-}
mapVals : Ctx -> Val -> List (List Val) -> Machine -> ( Result Flow (List Val), Machine )
mapVals ctx blk argLists m =
    List.foldl
        (\vs ( acc, mm ) ->
            case acc of
                Ok out ->
                    case callBlock ctx blk vs mm of
                        ( Value v, m2 ) ->
                            ( Ok (v :: out), m2 )

                        ( flow, m2 ) ->
                            ( Err flow, m2 )

                Err _ ->
                    ( acc, mm )
        )
        ( Ok [], m )
        argLists
        |> Tuple.mapFirst (Result.map List.reverse)


newArray : List Val -> Machine -> ( Flow, Machine )
newArray vs m =
    alloc (OArray (Array.fromList vs)) m |> Tuple.mapFirst Value


array : Ctx -> Int -> Array Val -> String -> List Val -> Machine -> ( Flow, Machine )
array ctx r a sel args m =
    let
        items =
            Array.toList a

        self =
            VRef r

        bounds i f =
            if i >= 1 && i <= Array.length a then
                f (i - 1)

            else
                ( Fail ("index " ++ String.fromInt i ++ " is out of bounds"), m )

        mapped blk f =
            mapVals ctx blk (List.map List.singleton items) m |> andThenVals f

        truthy vs =
            List.map2 Tuple.pair items vs
    in
    case ( sel, args ) of
        ( "size", [] ) ->
            ok (VInt (Array.length a)) m

        ( "at:", [ VInt i ] ) ->
            bounds i (\j -> ok (Array.get j a |> Maybe.withDefault VNil) m)

        ( "at:put:", [ VInt i, v ] ) ->
            bounds i (\j -> ok v { m | heap = Dict.insert r (OArray (Array.set j v a)) m.heap })

        ( "first", [] ) ->
            ok (Array.get 0 a |> Maybe.withDefault VNil) m

        ( "last", [] ) ->
            ok (Array.get (Array.length a - 1) a |> Maybe.withDefault VNil) m

        ( "isEmpty", [] ) ->
            ok (bool (Array.isEmpty a)) m

        ( "notEmpty", [] ) ->
            ok (bool (not (Array.isEmpty a))) m

        ( "includes:", [ x ] ) ->
            ok (bool (List.any (equal m x) items)) m

        ( "do:", [ blk ] ) ->
            each ctx blk items self m

        ( "doWithIndex:", [ blk ] ) ->
            mapVals ctx blk (List.indexedMap (\i v -> [ v, VInt (i + 1) ]) items) m |> andThenVals (\_ mm -> ok self mm)

        ( "keysAndValuesDo:", [ blk ] ) ->
            mapVals ctx blk (List.indexedMap (\i v -> [ VInt (i + 1), v ]) items) m |> andThenVals (\_ mm -> ok self mm)

        ( "collect:", [ blk ] ) ->
            mapped blk newArray

        ( "select:", [ blk ] ) ->
            mapped blk (\vs -> newArray (truthy vs |> List.filter (\( _, t ) -> t == VTrue) |> List.map Tuple.first))

        ( "reject:", [ blk ] ) ->
            mapped blk (\vs -> newArray (truthy vs |> List.filter (\( _, t ) -> t /= VTrue) |> List.map Tuple.first))

        ( "detect:ifNone:", [ blk, none ] ) ->
            mapped blk
                (\vs mm ->
                    case truthy vs |> List.filter (\( _, t ) -> t == VTrue) |> List.head of
                        Just ( v, _ ) ->
                            ok v mm

                        Nothing ->
                            callBlock ctx none [] mm
                )

        ( "inject:into:", [ start, blk ] ) ->
            List.foldl
                (\v ( flow, mm ) ->
                    case flow of
                        Value accV ->
                            callBlock ctx blk [ accV, v ] mm

                        _ ->
                            ( flow, mm )
                )
                ( Value start, m )
                items

        ( "reversed", [] ) ->
            newArray (List.reverse items) m

        ( ",", [ VRef o ] ) ->
            case Dict.get o m.heap of
                Just (OArray b) ->
                    newArray (items ++ Array.toList b) m

                _ ->
                    dnu m self sel

        ( "sum", [] ) ->
            List.foldl (\v ( flow, mm ) -> andFlow flow (\accV -> number ctx (numF accV) (numI accV) "+" [ v ] mm) mm) ( Value (VInt 0), m ) items

        ( "max", [] ) ->
            List.foldl (\v ( flow, mm ) -> andFlow flow (\accV -> number ctx (numF accV) (numI accV) "max:" [ v ] mm) mm) ( Value (List.head items |> Maybe.withDefault VNil), m ) (List.drop 1 items)

        ( "asSortedCollection", [] ) ->
            newArray (List.sortWith (order m) items) m

        ( "sorted", [] ) ->
            newArray (List.sortWith (order m) items) m

        ( "asArray", [] ) ->
            newArray items m

        ( "copyWith:", [ x ] ) ->
            newArray (items ++ [ x ]) m

        _ ->
            dnu m self sel


andFlow : Flow -> (Val -> ( Flow, Machine )) -> Machine -> ( Flow, Machine )
andFlow flow f m =
    case flow of
        Value v ->
            f v

        _ ->
            ( flow, m )


numF : Val -> Float
numF v =
    numVal v |> Maybe.map Tuple.first |> Maybe.withDefault 0


numI : Val -> Maybe Int
numI v =
    case v of
        VInt n ->
            Just n

        _ ->
            Nothing


order : Machine -> Val -> Val -> Order
order m a b =
    case ( numVal a, numVal b ) of
        ( Just ( x, _ ), Just ( y, _ ) ) ->
            compare x y

        _ ->
            compare (displayString m a) (displayString m b)


blockMsg : Ctx -> Val -> String -> List Val -> Machine -> ( Flow, Machine )
blockMsg ctx b sel args m =
    let
        while want body mm =
            case callBlock ctx b [] mm of
                ( Value v, m2 ) ->
                    if v == want then
                        case body of
                            Just blk ->
                                case callBlock ctx blk [] m2 of
                                    ( Value _, m3 ) ->
                                        while want body m3

                                    other ->
                                        other

                            Nothing ->
                                while want body m2

                    else
                        ( Value VNil, m2 )

                other ->
                    other
    in
    case ( sel, args ) of
        ( "value", [] ) ->
            callBlock ctx b [] m

        ( "value:", _ ) ->
            callBlock ctx b args m

        ( "value:value:", _ ) ->
            callBlock ctx b args m

        ( "value:value:value:", _ ) ->
            callBlock ctx b args m

        ( "valueWithArguments:", [ VRef r ] ) ->
            case Dict.get r m.heap of
                Just (OArray a) ->
                    callBlock ctx b (Array.toList a) m

                _ ->
                    dnu m b sel

        ( "whileTrue:", [ body ] ) ->
            while VTrue (Just body) m

        ( "whileFalse:", [ body ] ) ->
            while VFalse (Just body) m

        ( "whileTrue", [] ) ->
            while VTrue Nothing m

        ( "whileFalse", [] ) ->
            while VFalse Nothing m

        ( "numArgs", [] ) ->
            case b of
                VRef r ->
                    case Dict.get r m.heap of
                        Just (OBlock blk) ->
                            ok (VInt (List.length blk.params)) m

                        _ ->
                            dnu m b sel

                _ ->
                    dnu m b sel

        _ ->
            dnu m b sel


classMsg : String -> String -> List Val -> Machine -> ( Flow, Machine )
classMsg c sel args m =
    case ( sel, args ) of
        ( "new", [] ) ->
            if c == "Array" then
                newArray [] m

            else if Dict.get c m.classes |> Maybe.map .builtin |> Maybe.withDefault True then
                ( Fail ("cannot make a new " ++ c ++ ": use a literal"), m )

            else
                alloc (OInst c (Dict.fromList (List.map (\v -> ( v, VNil )) (allIvars m c)))) m |> Tuple.mapFirst Value

        ( "new:", [ VInt n ] ) ->
            if c == "Array" then
                newArray (List.repeat n VNil) m

            else
                dnu m (VClass c) sel

        ( "with:", _ ) ->
            arrayWith c args m sel

        ( "with:with:", _ ) ->
            arrayWith c args m sel

        ( "with:with:with:", _ ) ->
            arrayWith c args m sel

        ( "name", [] ) ->
            ok (VStr c) m

        ( "superclass", [] ) ->
            ok (Dict.get c m.classes |> Maybe.andThen .super |> Maybe.map VClass |> Maybe.withDefault VNil) m

        ( "selectors", [] ) ->
            newArray (selectors m c |> List.map VSym) m

        ( "instanceVariableNames", [] ) ->
            ok (VStr (Dict.get c m.classes |> Maybe.map (.ivars >> String.join " ") |> Maybe.withDefault "")) m

        ( "subclass:", [ VSym name ] ) ->
            define c name "" m

        ( "subclass:instanceVariableNames:", [ VSym name, VStr iv ] ) ->
            define c name iv m

        ( "subclass:instanceVariableNames:classVariableNames:package:", [ VSym name, VStr iv, _, _ ] ) ->
            define c name iv m

        ( "subclass:instanceVariableNames:classVariableNames:category:", [ VSym name, VStr iv, _, _ ] ) ->
            define c name iv m

        ( "compile:", [ VStr src ] ) ->
            case compile c src m of
                Ok ( sel2, m2 ) ->
                    ok (VSym sel2) m2

                Err e ->
                    ( Fail e, m )

        _ ->
            dnu m (VClass c) sel


arrayWith : String -> List Val -> Machine -> String -> ( Flow, Machine )
arrayWith c args m sel =
    if c == "Array" then
        newArray args m

    else
        dnu m (VClass c) sel


allIvars : Machine -> String -> List String
allIvars m c =
    case Dict.get c m.classes of
        Just cls ->
            (cls.super |> Maybe.map (allIvars m) |> Maybe.withDefault []) ++ cls.ivars

        Nothing ->
            []


define : String -> String -> String -> Machine -> ( Flow, Machine )
define super name ivars m =
    case Dict.get name m.classes of
        Just existing ->
            if existing.builtin then
                ( Fail (name ++ " is a built-in class"), m )

            else
                ok (VClass name) { m | classes = Dict.insert name { existing | super = Just super, ivars = String.words ivars } m.classes }

        Nothing ->
            if String.left 1 name /= String.toUpper (String.left 1 name) || name == "" then
                ( Fail "class names start with an upper-case letter", m )

            else
                ok (VClass name) { m | classes = Dict.insert name (Class name (Just super) (String.words ivars) Dict.empty False) m.classes }


transcript : Val -> String -> List Val -> Machine -> ( Flow, Machine )
transcript t sel args m =
    case ( sel, args ) of
        ( "show:", [ x ] ) ->
            ok t { m | transcript = m.transcript ++ displayString m x }

        ( "print:", [ x ] ) ->
            ok t { m | transcript = m.transcript ++ printString m x }

        ( "display:", [ x ] ) ->
            ok t { m | transcript = m.transcript ++ displayString m x }

        ( "cr", [] ) ->
            ok t { m | transcript = m.transcript ++ "\n" }

        ( "tab", [] ) ->
            ok t { m | transcript = m.transcript ++ "\t" }

        ( "space", [] ) ->
            ok t { m | transcript = m.transcript ++ " " }

        ( "clear", [] ) ->
            ok t { m | transcript = "" }

        _ ->
            dnu m t sel


smalltalk : Val -> String -> List Val -> Machine -> ( Flow, Machine )
smalltalk s sel args m =
    case ( sel, args ) of
        ( "at:put:", [ VSym k, v ] ) ->
            ok v { m | globals = Dict.insert k v m.globals }

        ( "at:", [ VSym k ] ) ->
            case Dict.get k m.globals of
                Just v ->
                    ok v m

                Nothing ->
                    ( Fail (k ++ " is not defined"), m )

        ( "includesKey:", [ VSym k ] ) ->
            ok (bool (Dict.member k m.globals || Dict.member k m.classes)) m

        _ ->
            dnu m s sel



-- PRINTING


printString : Machine -> Val -> String
printString m v =
    case v of
        VStr s ->
            "'" ++ String.replace "'" "''" s ++ "'"

        VSym s ->
            "#" ++ s

        VChar c ->
            "$" ++ String.fromChar c

        _ ->
            displayString m v


displayString : Machine -> Val -> String
displayString m v =
    case v of
        VNil ->
            "nil"

        VTrue ->
            "true"

        VFalse ->
            "false"

        VInt n ->
            String.fromInt n

        VFloat f ->
            let
                s =
                    String.fromFloat f
            in
            if String.contains "." s || String.contains "e" s || String.contains "N" s || String.contains "I" s then
                s

            else
                s ++ ".0"

        VStr s ->
            s

        VSym s ->
            s

        VChar c ->
            String.fromChar c

        VClass c ->
            c

        VSys s ->
            if s == "Transcript" then
                "a TranscriptStream"

            else
                "Smalltalk"

        VRef r ->
            case Dict.get r m.heap of
                Just (OArray a) ->
                    "#(" ++ String.join " " (List.map (printString m) (Array.toList a)) ++ ")"

                Just (OInst c _) ->
                    article c ++ " " ++ c

                Just (OBlock _) ->
                    "a BlockClosure"

                Nothing ->
                    "an Object"


article : String -> String
article c =
    if String.contains (String.left 1 c) "AEIOU" then
        "an"

    else
        "a"



-- WORKSPACE AND BROWSER


{-| Steps one evaluation may take before it is stopped, unless the machine
sets its own `limit`.
-}
budget : Int
budget =
    2000000


{-| Runs code and answers its last value. The machine comes back without
the objects that nothing refers to anymore.
-}
doIt : String -> Machine -> ( Result String Val, Machine )
doIt src m0 =
    case parseDoIt src of
        Err e ->
            ( Err ("syntax: " ++ e), m0 )

        Ok ( tmp, body ) ->
            let
                ( env, m1 ) =
                    newEnv (Dict.fromList (List.map (\t -> ( t, VNil )) tmp)) Nothing { m0 | fuel = m0.limit }

                ( flow, m2 ) =
                    evalStmts { env = env, self = VNil, home = env, cls = "UndefinedObject", depth = 0 } body m1
            in
            case flow of
                Value v ->
                    ( Ok v, collect [ v ] m2 )

                Ret _ v ->
                    ( Ok v, collect [ v ] m2 )

                Fail e ->
                    ( Err e, collect [] m2 )


{-| Like `doIt`, answering the printString of the value, as Smalltalk's
"print it" does; a class can change it by defining printString.
-}
printIt : String -> Machine -> ( Result String String, Machine )
printIt src m =
    case doIt src m of
        ( Ok v, m2 ) ->
            let
                ( env, m3 ) =
                    newEnv Dict.empty Nothing { m2 | fuel = m2.limit }
            in
            case send { env = env, self = VNil, home = env, cls = "UndefinedObject", depth = 0 } v "printString" [] m3 of
                ( Value (VStr s), m4 ) ->
                    ( Ok s, collect [] m4 )

                ( _, m4 ) ->
                    ( Ok (printString m4 v), collect [] m4 )

        ( Err e, m2 ) ->
            ( Err e, m2 )


{-| Keeps the heap objects and environments that the globals (and `keep`)
still reach, and drops the rest.
-}
collect : List Val -> Machine -> Machine
collect keep m =
    let
        refs v =
            case v of
                VRef r ->
                    [ r ]

                _ ->
                    []

        mark ( objs, envs ) work =
            case work of
                [] ->
                    ( objs, envs )

                ( isEnv, id ) :: rest ->
                    if isEnv then
                        if Dict.member id envs then
                            mark ( objs, envs ) rest

                        else
                            case Dict.get id m.envs of
                                Just e ->
                                    mark ( objs, Dict.insert id e envs )
                                        (List.map (Tuple.pair False) (List.concatMap refs (Dict.values e.vars))
                                            ++ (e.parent |> Maybe.map (\p -> [ ( True, p ) ]) |> Maybe.withDefault [])
                                            ++ rest
                                        )

                                Nothing ->
                                    mark ( objs, envs ) rest

                    else if Dict.member id objs then
                        mark ( objs, envs ) rest

                    else
                        case Dict.get id m.heap of
                            Just o ->
                                mark ( Dict.insert id o objs, envs )
                                    ((case o of
                                        OArray a ->
                                            List.map (Tuple.pair False) (List.concatMap refs (Array.toList a))

                                        OInst _ fields ->
                                            List.map (Tuple.pair False) (List.concatMap refs (Dict.values fields))

                                        OBlock b ->
                                            ( True, b.env ) :: List.map (Tuple.pair False) (refs b.self)
                                     )
                                        ++ rest
                                    )

                            Nothing ->
                                mark ( objs, envs ) rest

        ( heap, envs2 ) =
            mark ( Dict.empty, Dict.empty ) (List.map (Tuple.pair False) (List.concatMap refs (keep ++ Dict.values m.globals)))
    in
    { m | heap = heap, envs = envs2 }


{-| Adds or replaces a method; answers its selector.
-}
compile : String -> String -> Machine -> Result String ( String, Machine )
compile cls src m =
    case Dict.get cls m.classes of
        Nothing ->
            Err ("no class " ++ cls)

        Just c ->
            parseMethod (String.trim src)
                |> Result.mapError (\e -> "syntax: " ++ e)
                |> Result.map (\meth -> ( meth.selector, { m | classes = Dict.insert cls { c | methods = Dict.insert meth.selector meth c.methods } m.classes } ))


selectors : Machine -> String -> List String
selectors m cls =
    Dict.get cls m.classes |> Maybe.map (.methods >> Dict.keys) |> Maybe.withDefault []


methodSource : Machine -> String -> String -> String
methodSource m cls sel =
    Dict.get cls m.classes |> Maybe.andThen (.methods >> Dict.get sel) |> Maybe.map .source |> Maybe.withDefault ""


classDefinition : Machine -> String -> String
classDefinition m cls =
    case Dict.get cls m.classes of
        Just c ->
            Maybe.withDefault "nil" c.super ++ " subclass: #" ++ c.name ++ "\n    instanceVariableNames: '" ++ String.join " " c.ivars ++ "'"

        Nothing ->
            "Object subclass: #NameOfClass\n    instanceVariableNames: 'one two'"


{-| Classes the visitor made, then built-in classes that have methods of theirs.
-}
userClasses : Machine -> List String
userClasses m =
    let
        cs =
            Dict.values m.classes
    in
    List.map .name (List.filter (not << .builtin) cs) ++ List.map .name (List.filter (\c -> c.builtin && not (Dict.isEmpty c.methods)) cs)



-- IMAGE


type alias Image =
    { workspace : String, transcript : String, machine : Machine }


{-| Classes in an order where each superclass comes first.
-}
ordered : Machine -> List Class
ordered m =
    let
        depth c =
            case c.super |> Maybe.andThen (\s -> Dict.get s m.classes) of
                Just p ->
                    1 + depth p

                Nothing ->
                    0
    in
    Dict.values m.classes |> List.sortBy depth


encodeImage : String -> Machine -> String
encodeImage workspace m =
    E.encode 0
        (E.object
            [ ( "version", E.int 1 )
            , ( "workspace", E.string workspace )
            , ( "transcript", E.string (String.right 20000 m.transcript) )
            , ( "classes"
              , E.list
                    (\c ->
                        E.object
                            [ ( "name", E.string c.name )
                            , ( "super", Maybe.map E.string c.super |> Maybe.withDefault E.null )
                            , ( "ivars", E.list E.string c.ivars )
                            , ( "builtin", E.bool c.builtin )
                            , ( "methods", E.list (.source >> E.string) (Dict.values c.methods) )
                            ]
                    )
                    (ordered m |> List.filter (\c -> not c.builtin || not (Dict.isEmpty c.methods)))
              )
            ]
        )


{-| Rebuilds an image by compiling the saved sources again; a method that
no longer compiles is dropped.
-}
decodeImage : String -> Result String Image
decodeImage json =
    let
        cls =
            D.map5 (\n s iv b ms -> { name = n, super = s, ivars = iv, builtin = b, methods = ms })
                (D.field "name" D.string)
                (D.field "super" (D.nullable D.string))
                (D.field "ivars" (D.list D.string))
                (D.field "builtin" D.bool)
                (D.field "methods" (D.list D.string))
    in
    D.decodeString
        (D.map3 (\w t cs -> ( w, t, cs ))
            (D.field "workspace" D.string)
            (D.field "transcript" D.string)
            (D.field "classes" (D.list cls))
        )
        json
        |> Result.mapError D.errorToString
        |> Result.map
            (\( w, t, cs ) ->
                let
                    m =
                        List.foldl
                            (\c mm ->
                                let
                                    withClass =
                                        if c.builtin then
                                            mm

                                        else
                                            { mm | classes = Dict.insert c.name (Class c.name c.super c.ivars Dict.empty False) mm.classes }
                                in
                                List.foldl (\src m2 -> compile c.name src m2 |> Result.map Tuple.second |> Result.withDefault m2) withClass c.methods
                            )
                            boot
                            cs
                in
                { workspace = w, transcript = t, machine = { m | transcript = t } }
            )
