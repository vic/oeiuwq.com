module GameTest exposing (suite)

import Expect
import Game
import Test exposing (Test, describe, test)


run : Int -> (Game.Game -> Game.Game) -> Game.Game -> Game.Game
run frames steer g =
    if frames == 0 || Game.won g then
        g

    else
        run (frames - 1) steer (Game.step 16 (steer g))


{-| Steers under the lowest bug, as a player would.
-}
chase : Game.Game -> Game.Game
chase g =
    case List.sortBy (\b -> negate b.y) g.bugs of
        b :: _ ->
            Game.moveTo b.x g

        [] ->
            g


suite : Test
suite =
    describe "Game"
        [ test "a player who does nothing still wins when the time is up" <|
            \_ -> run 100000 identity (Game.new Game.defaultRules 7) |> (\g -> ( Game.won g, g.t >= Game.defaultRules.seconds )) |> Expect.equal ( True, True )
        , test "a player who chases bugs wins by fixing them before the time is up" <|
            \_ -> run 100000 chase (Game.new Game.defaultRules 7) |> (\g -> ( g.score >= Game.defaultRules.goal, g.t < Game.defaultRules.seconds )) |> Expect.equal ( True, True )
        , test "edited rules are checked" <| \_ -> Game.parse "goal: 0\nseconds: 30\nspeed: 11\nevery: 1\nbugs: x" |> Expect.equal (Err "goal must be between 1 and 999")
        , test "the default rules parse" <| \_ -> Game.parse Game.defaultSource |> Result.map .goal |> Expect.equal (Ok 12)
        , test "a new game is not won" <|
            \_ -> Game.won (Game.new Game.defaultRules 1) |> Expect.equal False
        , test "the ship stays on the field" <|
            \_ -> (Game.nudge 1000 (Game.new Game.defaultRules 1)).target |> Expect.atMost 96
        ]
