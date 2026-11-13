module TaleTest exposing (suite)

import Expect
import Json.Decode as D
import Tale
import Test exposing (Test, describe, test)


story : Tale.Story
story =
    case Tale.parse Tale.defaultSource of
        Ok s ->
            s

        Err e ->
            Debug.todo e


play : List String -> ( Tale.World, List String )
play cmds =
    List.foldl (\c ( w, _ ) -> Tale.run story c w) ( Tale.new story, [] ) cmds


walkthrough : List String
walkthrough =
    [ "e", "take potato", "w", "n", "w", "take keycard", "e", "e", "throw the potato at the drone", "take disk", "w", "s", "take lamp", "n", "n", "u", "put disk in antenna" ]


suite : Test
suite =
    describe "THE LOST COMMIT"
        [ test "the default story parses" <| \_ -> Tale.parse Tale.defaultSource |> Result.map (always ()) |> Expect.equal (Ok ())
        , test "a broken story says which line" <| \_ -> Tale.parse "start x\nroom x X\nexit north nowhere" |> Expect.equal (Err "x has an exit north to a room \"nowhere\" that does not exist")
        , test "the walkthrough wins" <| \_ -> play walkthrough |> Tuple.first |> .won |> Expect.equal True
        , test "the vault stays locked without the keycard" <| \_ -> play [ "n", "e" ] |> Tuple.first |> .room |> Expect.equal "hallway"
        , test "the drone guards the disk until it has a potato" <|
            \_ -> play [ "e", "take potato", "w", "n", "w", "take keycard", "e", "e", "take disk", "i" ] |> Tuple.second |> List.any (String.contains "disk") |> Expect.equal False
        , test "the stairs can't be climbed in the dark" <| \_ -> play [ "n", "n", "u" ] |> Tuple.first |> .room |> Expect.equal "stairwell"
        , test "take all, drop, and inventory" <|
            \_ -> play [ "take all", "drop keyboard", "i" ] |> Tuple.second |> Expect.equal [ "You are carrying:", "  lamp" ]
        , test "a thrown thing lands in the room" <| \_ -> play [ "take lamp", "e", "take mug", "throw mug", "look" ] |> Tuple.second |> List.any (String.contains "a mug") |> Expect.equal True
        , test "an unknown verb is explained, not a crash" <| \_ -> play [ "frobnicate the lamp" ] |> Tuple.second |> List.head |> Maybe.map (String.startsWith "I don't know how") |> Expect.equal (Just True)
        , test "a saved game comes back the same" <|
            \_ ->
                let
                    ( w, _ ) =
                        play [ "e", "take potato", "drink coffee" ]
                in
                D.decodeValue Tale.decode (Tale.encode w) |> Expect.equal (Ok w)
        ]
