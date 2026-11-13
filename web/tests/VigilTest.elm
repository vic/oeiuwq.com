module VigilTest exposing (suite)

import Expect
import Test exposing (Test, describe, test)
import Vigil


stage : Vigil.Stage
stage =
    case Vigil.parse Vigil.defaultSource of
        Ok s ->
            s

        Err e ->
            Debug.todo e


playing : Vigil.Game
playing =
    List.foldl (\_ g -> Vigil.start g) (Vigil.new stage) stage.pages


{-| A player who runs right, lashes all the time, and jumps at pits and walls.
-}
runRight : Int -> Vigil.Game -> Vigil.Game
runRight frames g =
    if frames == 0 || g.phase == Vigil.Won then
        g

    else
        let
            ahead =
                floor ((g.x + 30) / 16)

            danger =
                Vigil.tileAt g.map ahead (floor ((g.y + 26) / 16)) == ' ' || Vigil.tileAt g.map ahead (floor ((g.y + 11) / 16)) == '#'

            jump =
                (g.onGround && danger) || (not g.onGround && g.vy < 0)
        in
        runRight (frames - 1) (Vigil.step 16 { left = False, right = True, jump = jump, lash = True } g)


suite : Test
suite =
    describe "NEON VIGIL"
        [ test "a stage without a gate says so" <| \_ -> Vigil.parse (String.replace "G" " " Vigil.defaultSource) |> Expect.equal (Err "the map needs a vault gate, G")
        , test "the story pages lead to the stage" <| \_ -> playing.phase |> Expect.equal Vigil.Playing
        , test "every row of the stage is as wide as the first" <|
            \_ -> ( List.length stage.map, List.map String.length stage.map |> List.all ((==) 100) ) |> Expect.equal ( 15, True )
        , test "Rook lands on the floor and stays there" <|
            \_ -> List.foldl (\_ g -> Vigil.step 16 { left = False, right = False, jump = False, lash = False } g) playing (List.range 1 120) |> (\g -> ( g.onGround, g.y < 200 )) |> Expect.equal ( True, True )
        , test "Rook lands on a ledge from above" <|
            \_ -> List.foldl (\_ g -> Vigil.step 16 { left = False, right = False, jump = False, lash = False } g) { playing | x = 470, y = 90 } (List.range 1 90) |> (\g -> ( g.onGround, round g.y )) |> Expect.equal ( True, 122 )
        , test "a player who runs, jumps and lashes reaches the vault gate" <|
            \_ -> runRight 6000 playing |> .phase |> Expect.equal Vigil.Won
        ]
