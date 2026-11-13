module Game exposing (Game, Rules, defaultRules, defaultSource, moveTo, new, nudge, parse, step, view, won)

{-| BUG HUNT, the arcade game of sponsor.oeiuwq.com. Compiler errors fall,
the ship fires on its own, and the player steers. There are no lives and no
game over: the game ends in a win when the player fixes the goal of bugs or
when the time is up, whichever comes first. The rules are a small file.
-}

import Svg exposing (Svg)
import Svg.Attributes as SA


{-| The field is 100 by 75 units, the size of the SVG view box.
-}
width : Float
width =
    100


shipY : Float
shipY =
    68


{-| What a game of BUG HUNT is made of. The page edits it as a small file.
-}
type alias Rules =
    { goal : Int, seconds : Float, speed : Float, every : Float, bugs : List String }


defaultSource : String
defaultSource =
    """# BUG HUNT rules. Edit them and press RUN.
# You win when you fix `goal` bugs, or when `seconds` pass. Nobody loses.
goal: 12
seconds: 30
# how fast bugs fall (field units per second) and how often a new one comes
speed: 11
every: 0.8
bugs: segfault, null, OOM, E0382, deadlock, off-by-1, NaN, UB, infinite recursion, stack overflow, type mismatch, race
"""


{-| Reads `key: value` lines; numbers must be positive and there must be a bug name.
-}
parse : String -> Result String Rules
parse src =
    let
        fields =
            String.lines src
                |> List.filter (\l -> not (String.startsWith "#" (String.trim l)) && String.contains ":" l)
                |> List.map (\l -> ( String.trim (String.left (Maybe.withDefault 0 (List.head (String.indexes ":" l))) l), String.trim (String.dropLeft (Maybe.withDefault 0 (List.head (String.indexes ":" l)) + 1) l) ))

        get k =
            List.filter (\( key, _ ) -> key == k) fields |> List.head |> Maybe.map Tuple.second

        number k lo hi =
            case get k |> Maybe.andThen String.toFloat of
                Just n ->
                    if n >= lo && n <= hi then
                        Ok n

                    else
                        Err (k ++ " must be between " ++ String.fromFloat lo ++ " and " ++ String.fromFloat hi)

                Nothing ->
                    Err ("write a number after \"" ++ k ++ ":\"")

        bugs =
            get "bugs" |> Maybe.map (String.split "," >> List.map String.trim >> List.filter ((/=) "")) |> Maybe.withDefault []
    in
    Result.map4 (\g s sp ev -> Rules (round g) s sp ev bugs)
        (number "goal" 1 999)
        (number "seconds" 5 600)
        (number "speed" 1 80)
        (number "every" 0.1 10)
        |> Result.andThen
            (\r ->
                if List.isEmpty bugs then
                    Err "write some bug names after \"bugs:\""

                else
                    Ok r
            )


defaultRules : Rules
defaultRules =
    parse defaultSource |> Result.withDefault (Rules 12 30 11 0.8 [ "bug" ])


type alias Bug =
    { x : Float, y : Float, name : String }


type alias Game =
    { t : Float
    , x : Float
    , target : Float
    , bullets : List ( Float, Float )
    , bugs : List Bug
    , pops : List { x : Float, y : Float, ttl : Float, name : String }
    , score : Int
    , seed : Int
    , fireIn : Float
    , spawnIn : Float
    , rules : Rules
    }


new : Rules -> Int -> Game
new rules seed =
    { t = 0, x = width / 2, target = width / 2, bullets = [], bugs = [], pops = [], score = 0, seed = seed, fireIn = 0, spawnIn = 0, rules = rules }


won : Game -> Bool
won g =
    g.score >= g.rules.goal || g.t >= g.rules.seconds


moveTo : Float -> Game -> Game
moveTo x g =
    { g | target = clamp 4 (width - 4) x }


nudge : Float -> Game -> Game
nudge dx g =
    moveTo (g.target + dx) g


{-| A linear congruential step: the game needs no random package.
-}
next : Int -> Int
next s =
    modBy 2147483648 (s * 1103515245 + 12345)


{-| Advances the game by `ms` milliseconds.
-}
step : Float -> Game -> Game
step ms g0 =
    let
        dt =
            Basics.min 0.1 (ms / 1000)

        g =
            { g0 | t = g0.t + dt, x = g0.x + (g0.target - g0.x) * Basics.min 1 (dt * 12) }

        ( fired, fireIn ) =
            if g.fireIn - dt <= 0 then
                ( ( g.x, shipY - 3 ) :: g.bullets, 0.22 )

            else
                ( g.bullets, g.fireIn - dt )

        seed1 =
            next g.seed

        ( spawned, spawnIn, seed2 ) =
            if g.spawnIn - dt <= 0 then
                let
                    x =
                        8 + toFloat (modBy 84 (seed1 // 65536))

                    name =
                        List.drop (modBy (List.length g.rules.bugs) (seed1 // 7)) g.rules.bugs |> List.head |> Maybe.withDefault "bug"
                in
                ( Bug x -4 name :: g.bugs, g.rules.every, next seed1 )

            else
                ( g.bugs, g.spawnIn - dt, g.seed )

        bullets =
            fired |> List.map (\( x, y ) -> ( x, y - 90 * dt )) |> List.filter (\( _, y ) -> y > -5)

        bugs =
            spawned |> List.map (\b -> { b | y = b.y + g.rules.speed * dt }) |> List.filter (\b -> b.y < 80)

        hit b =
            List.any (\( x, y ) -> abs (x - b.x) < 5 && abs (y - b.y) < 4) bullets

        ( dead, alive ) =
            List.partition hit bugs

        spent ( x, y ) =
            List.any (\b -> abs (x - b.x) < 5 && abs (y - b.y) < 4) dead
    in
    { g
        | bullets = List.filter (not << spent) bullets
        , bugs = alive
        , pops =
            List.map (\b -> { x = b.x, y = b.y, ttl = 0.8, name = b.name }) dead
                ++ (g.pops |> List.map (\p -> { p | ttl = p.ttl - dt, y = p.y - 8 * dt }) |> List.filter (\p -> p.ttl > 0))
        , score = g.score + List.length dead
        , seed = seed2
        , fireIn = fireIn
        , spawnIn = spawnIn
    }


f : Float -> String
f =
    String.fromFloat


view : Game -> Svg msg
view g =
    Svg.g []
        (List.map (\b -> Svg.g [ SA.class "bug" ] [ Svg.text_ [ SA.x (f b.x), SA.y (f b.y), SA.textAnchor "middle" ] [ Svg.text "▼" ], Svg.text_ [ SA.x (f b.x), SA.y (f (b.y - 3.5)), SA.textAnchor "middle", SA.class "name" ] [ Svg.text b.name ] ]) g.bugs
            ++ List.map (\( x, y ) -> Svg.rect [ SA.x (f (x - 0.4)), SA.y (f y), SA.width "0.8", SA.height "2.5", SA.class "shot" ] []) g.bullets
            ++ List.map (\p -> Svg.text_ [ SA.x (f p.x), SA.y (f p.y), SA.textAnchor "middle", SA.class "pop", SA.opacity (f (p.ttl / 0.8)) ] [ Svg.text "+1 fixed" ]) g.pops
            ++ [ Svg.text_ [ SA.x (f g.x), SA.y (f (shipY + 3)), SA.textAnchor "middle", SA.class "ship" ] [ Svg.text "▲" ]
               , Svg.text_ [ SA.x "2", SA.y "5", SA.class "hud" ] [ Svg.text ("FIXED " ++ String.fromInt g.score ++ "/" ++ String.fromInt g.rules.goal) ]
               , Svg.text_ [ SA.x "98", SA.y "5", SA.class "hud", SA.textAnchor "end" ] [ Svg.text ("TIME " ++ String.fromInt (Basics.max 0 (ceiling (g.rules.seconds - g.t)))) ]
               ]
        )
