module StTest exposing (suite)

import Expect
import St
import Test exposing (Test, describe, test)


{-| Runs each source in turn on one machine; answers the last printIt.
-}
run : List String -> Result String String
run srcs =
    List.foldl (\src ( _, m ) -> St.printIt src m) ( Ok "", small ) srcs |> Tuple.first


{-| A small step limit keeps the endless-loop tests fast.
-}
small : St.Machine
small =
    let
        m =
            St.boot
    in
    { m | limit = 20000 }


p : String -> Result String String
p src =
    run [ src ]


suite : Test
suite =
    describe "Smalltalk"
        [ test "binary messages go left to right" <| \_ -> p "3 + 4 * 2" |> Expect.equal (Ok "14")
        , test "unary before binary before keyword" <| \_ -> p "(3 + 4 squared) max: 2 + 1" |> Expect.equal (Ok "19")
        , test "division gives a float when it must" <| \_ -> List.map p [ "6 / 3", "7 / 2", "7 // 2", "7 \\\\ 2" ] |> Expect.equal [ Ok "2", Ok "3.5", Ok "3", Ok "1" ]
        , test "literal arrays and collect:" <| \_ -> p "#(1 $a 'b' #c (2)) , ((1 to: 3) collect: [:i | i * i])" |> Expect.equal (Ok "#(1 $a 'b' #c #(2) 1 4 9)")
        , test "inject:into: and select:" <| \_ -> p "((1 to: 10) select: [:i | i even]) inject: 0 into: [:a :b | a + b]" |> Expect.equal (Ok "30")
        , test "a cascade goes to the first receiver" <| \_ -> p "Transcript show: 'a'; show: 'b'; cr; yourself" |> Expect.equal (Ok "a TranscriptStream")
        , test "variables persist between do-its" <| \_ -> run [ "x := 40", "x + 2" ] |> Expect.equal (Ok "42")
        , test "strings" <| \_ -> p "('hello' , ' world') asUppercase reversed" |> Expect.equal (Ok "'DLROW OLLEH'")
        , test "a method on Integer" <|
            \_ -> run [ "Integer compile: 'fib ^self < 2 ifTrue: [self] ifFalse: [(self - 1) fib + (self - 2) fib]'", "15 fib" ] |> Expect.equal (Ok "610")
        , test "a class with state, super and printString" <|
            \_ ->
                run
                    [ "Object subclass: #Counter instanceVariableNames: 'n'"
                    , "Counter compile: 'increment n := (n ifNil: [0]) + 1. ^n'"
                    , "Counter subclass: #Twice instanceVariableNames: ''"
                    , "Twice compile: 'increment super increment. ^super increment'"
                    , "Twice compile: 'printString ^''twice '' , self increment printString'"
                    , "Twice new increment; increment; yourself"
                    ]
                    |> Expect.equal (Ok "twice 6")
        , test "^ in a block returns from the method" <|
            \_ ->
                run [ "Object subclass: #F instanceVariableNames: ''", "F compile: 'find: x #(1 2 3) do: [:e | e = x ifTrue: [^#found]]. ^#none'", "(F new find: 2) -> (F new find: 9)" ]
                    |> Expect.equal (Ok "#(#found #none)")
        , test "^ in a block passes through the methods that called the block" <|
            \_ ->
                run [ "Object subclass: #G instanceVariableNames: ''", "G compile: 'each: b #(1 2 3) do: [:e | b value: e]'", "G compile: 'find: x self each: [:e | e = x ifTrue: [^#found]]. ^#none'", "G new find: 2" ]
                    |> Expect.equal (Ok "#found")
        , test "an endless loop stops with an error" <| \_ -> p "[true] whileTrue" |> Expect.equal (Err "out of steps: the code ran too long")
        , test "endless recursion stops with an error" <|
            \_ -> run [ "Integer compile: 'down ^(self - 1) down'", "1 down" ] |> Expect.equal (Err "stack overflow: too many nested sends")
        , test "an unknown message says so" <| \_ -> p "3 frobnicate" |> Expect.equal (Err "3 doesNotUnderstand: #frobnicate")
        , test "a syntax error says so" <| \_ -> p "3 + " |> Expect.err
        , test "the image keeps classes and methods" <|
            \_ ->
                let
                    m =
                        List.foldl (\src mm -> St.doIt src mm |> Tuple.second) small [ "Object subclass: #A instanceVariableNames: 'v'", "A compile: 'v ^v ifNil: [7]'", "Integer compile: 'twice ^self * 2'" ]
                in
                St.decodeImage (St.encodeImage "w" m)
                    |> Result.map (\img -> ( img.workspace, St.printIt "A new v twice" img.machine |> Tuple.first ))
                    |> Expect.equal (Ok ( "w", Ok "14" ))
        , test "objects nothing refers to are collected" <|
            \_ ->
                let
                    ( _, m ) =
                        St.doIt "1 to: 1000 do: [:i | Array new: 3]. kept := #(1 2)" small
                in
                St.printIt "kept" m |> Tuple.first |> Expect.equal (Ok "#(1 2)")
        ]
