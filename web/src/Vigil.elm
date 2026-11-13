module Vigil exposing (Game, Input, Phase(..), Stage, defaultSource, new, parse, start, step, tileAt, view)

{-| NEON VIGIL, the NES-style game of nes.oeiuwq.com: run, jump and lash
through a neon arcology, then reach the gate of the server vault.

Pure game logic and its SVG. The page owns the keys and the clock.
Falling into a pit or running out of energy sends Rook back to the last
checkpoint: there is no game over.

-}

import Svg exposing (Svg)
import Svg.Attributes as SA


tile : Float
tile =
    16


{-| A stage file: story pages, the ending, then the map. In the map, 15 rows
of 16-pixel tiles: `#` wall, `=` ledge (jump up through it), `d` drone,
`b` patrol bot, `c` checkpoint, `h` energy cell, `G` the vault gate.
-}
defaultSource : String
defaultSource =
    """# NEON VIGIL stage file. Edit it and press RUN.
# story lines are the pages before the stage, ending is the last page.
story 2089. The Arcology of Tenochtitlan never sleeps. Its towers hum with the thoughts of ten million people, and one company owns every one of those thoughts.
story You are ROOK, a night courier with a plasma lash and an old habit: you deliver what people need, not what they are told to want.
story Tonight the company will lock the public code vault for good. Run to the vault gate before dawn, and set the code free.
ending The public code flows through the towers again, free for anyone who needs it. Rook disappears into the morning rain.
map
                                                                                                    
                                                                                                    
                                                                                                    
                                                                                                    
                            d                    d                       d                       ## 
                     d                                         d                                 ## 
                  h      =====          d    =======        h                     d              ## 
                                                                    =====                        ## 
            ====                  ===                  ====                     ====             ## 
                            =====            c      ===                 =====                    ## 
      c                                                                                          ## 
               b                    b             b                  b              b          G ## 
####################   ###########################  ########  #########  ###########################
####################   ###########################  ########  #########  ###########################
####################   ###########################  ########  #########  ###########################
"""


type alias Enemy =
    { x : Float, y : Float, home : Float, kind : Char, alive : Bool, t : Float }


type Phase
    = Story Int
    | Playing
    | Won


type alias Input =
    { left : Bool, right : Bool, jump : Bool, lash : Bool }


type alias Game =
    { phase : Phase
    , x : Float
    , y : Float
    , vx : Float
    , vy : Float
    , onGround : Bool
    , facing : Float
    , lashing : Float
    , hurt : Float
    , energy : Int
    , checkpoint : ( Float, Float )
    , enemies : List Enemy
    , cells : List ( Float, Float )
    , score : Int
    , t : Float
    , jumpHeld : Bool
    , map : List String
    , pages : List String
    , ending : String
    }


tileAt : List String -> Int -> Int -> Char
tileAt map col row =
    List.drop row map |> List.head |> Maybe.andThen (String.slice col (col + 1) >> String.uncons) |> Maybe.map Tuple.first |> Maybe.withDefault ' '


width : List String -> Float
width map =
    (List.head map |> Maybe.map String.length |> Maybe.withDefault 0 |> toFloat) * tile


solid : List String -> Float -> Float -> Bool
solid map px py =
    let
        c =
            tileAt map (floor (px / tile)) (floor (py / tile))
    in
    c == '#'


new : Stage -> Game
new stage =
    let
        spots ch =
            List.concat
                (List.indexedMap
                    (\r row -> String.toList row |> List.indexedMap Tuple.pair |> List.filter (\( _, c ) -> c == ch) |> List.map (\( col, _ ) -> ( toFloat col * tile, toFloat r * tile )))
                    stage.map
                )

        enemy kind ( x, y ) =
            { x = x, y = y, home = x, kind = kind, alive = True, t = x / 37 }
    in
    { phase = Story 0
    , x = 32
    , y = 150
    , vx = 0
    , vy = 0
    , onGround = False
    , facing = 1
    , lashing = 0
    , hurt = 0
    , energy = 6
    , checkpoint = ( 32, 150 )
    , enemies = List.map (enemy 'd') (spots 'd') ++ List.map (enemy 'b') (spots 'b')
    , cells = spots 'h'
    , score = 0
    , t = 0
    , jumpHeld = False
    , map = stage.map
    , pages = stage.pages
    , ending = stage.ending
    }


{-| Turns the page of the story, then starts the stage.
-}
start : Game -> Game
start g =
    case g.phase of
        Story n ->
            if n + 1 >= List.length g.pages then
                { g | phase = Playing }

            else
                { g | phase = Story (n + 1) }

        _ ->
            g


{-| Rook's box: 10 wide, 22 tall, (x, y) the top left.
-}
box : ( Float, Float )
box =
    ( 10, 22 )


touchesSolid : List String -> Float -> Float -> Bool
touchesSolid map x y =
    let
        ( w, h ) =
            box
    in
    List.any (\( px, py ) -> solid map px py) [ ( x + 1, y + 1 ), ( x + w - 1, y + 1 ), ( x + 1, y + h - 1 ), ( x + w - 1, y + h - 1 ), ( x + 1, y + h / 2 ), ( x + w - 1, y + h / 2 ) ]


step : Float -> Input -> Game -> Game
step ms input g =
    case g.phase of
        Playing ->
            play (Basics.min 0.05 (ms / 1000)) input g

        _ ->
            g


play : Float -> Input -> Game -> Game
play dt input g0 =
    let
        g =
            { g0 | t = g0.t + dt, hurt = Basics.max 0 (g0.hurt - dt), lashing = Basics.max 0 (g0.lashing - dt) }

        run =
            (if input.left then
                -1

             else
                0
            )
                + (if input.right then
                    1

                   else
                    0
                  )

        jumping =
            input.jump && not g.jumpHeld && g.onGround

        vy0 =
            if jumping then
                -330

            else if not input.jump && g.vy < -120 then
                -120

            else
                g.vy

        vy =
            Basics.min 420 (vy0 + 900 * dt)

        vx =
            if g.hurt > 0.3 then
                g.vx

            else
                run * 95

        nx =
            clamp 0 (width g.map - 10) (g.x + vx * dt)

        x =
            if touchesSolid g.map nx g.y then
                g.x

            else
                nx

        ny =
            g.y + vy * dt

        ledgeTop =
            toFloat (floor ((ny + 22) / tile)) * tile

        landsOnLedge =
            vy > 0 && g.y + 22 <= ledgeTop + 0.01 && List.any (\px -> tileAt g.map (floor (px / tile)) (floor ((ny + 22) / tile)) == '=') [ x + 1, x + 9 ]

        standsOnLedge =
            List.any (\px -> tileAt g.map (floor (px / tile)) (floor ((ny + 23) / tile)) == '=') [ x + 1, x + 9 ] && toFloat (floor ((ny + 23) / tile)) * tile - (ny + 22) < 0.5

        ( y, vy2, ground ) =
            if touchesSolid g.map x ny || landsOnLedge then
                if vy > 0 then
                    ( ledgeTop - 22, 0, True )

                else
                    ( g.y, 0, False )

            else
                ( ny, vy, vy >= 0 && (touchesSolid g.map x (ny + 1) || standsOnLedge) )

        lash =
            if input.lash && g.lashing <= 0 then
                0.3

            else
                g.lashing

        facing =
            if run /= 0 then
                run

            else
                g.facing

        lashBox =
            if lash > 0.12 then
                Just
                    ( if facing > 0 then
                        x + 10

                      else
                        x - 30
                    , y + 6
                    )

            else
                Nothing

        moved =
            List.map (moveEnemy dt) g.enemies

        struck e =
            case lashBox of
                Just ( lx, ly ) ->
                    e.alive && e.x + 12 > lx && e.x < lx + 30 && e.y + 12 > ly - 4 && e.y < ly + 8

                Nothing ->
                    False

        enemies =
            List.map
                (\e ->
                    if struck e then
                        { e | alive = False }

                    else
                        e
                )
                moved

        kills =
            List.length (List.filter struck moved)

        hitBy =
            List.filter (\e -> e.alive && abs (e.x + 6 - (x + 5)) < 11 && abs (e.y + 6 - (y + 11)) < 15) enemies |> List.head

        ( taken, cells ) =
            List.partition (\( cx, cy ) -> abs (cx + 8 - (x + 5)) < 12 && abs (cy + 8 - (y + 11)) < 16) g.cells

        checkpoint =
            if List.any (\r -> tileAt g.map (floor ((x + 5) / tile)) r == 'c') (List.range 0 (List.length g.map - 1)) then
                ( toFloat (floor ((x + 5) / tile)) * tile, y )

            else
                g.checkpoint

        g2 =
            { g
                | x = x
                , y = y
                , vx = vx
                , vy = vy2
                , onGround = ground
                , facing = facing
                , lashing = lash
                , enemies = enemies
                , cells = cells
                , checkpoint = checkpoint
                , energy = Basics.min 6 (g.energy + 2 * List.length taken)
                , score = g.score + 100 * kills + 50 * List.length taken
                , jumpHeld = input.jump
            }

        g3 =
            case hitBy of
                Just e ->
                    if g2.hurt > 0 then
                        g2

                    else
                        { g2
                            | energy = g2.energy - 1
                            , hurt = 0.9
                            , vx =
                                if e.x > x then
                                    -110

                                else
                                    110
                            , vy = -180
                        }

                Nothing ->
                    g2
    in
    if tileAt g.map (floor ((x + 5) / tile)) (floor ((y + 11) / tile)) == 'G' then
        { g3 | phase = Won, score = g3.score + 1000 }

    else if g3.y > 240 || g3.energy <= 0 then
        let
            ( cx, cy ) =
                g3.checkpoint
        in
        { g3 | x = cx, y = cy, vx = 0, vy = 0, energy = 6, hurt = 1 }

    else
        g3


moveEnemy : Float -> Enemy -> Enemy
moveEnemy dt e =
    let
        t =
            e.t + dt
    in
    if e.kind == 'd' then
        { e | t = t, x = e.home + 28 * sin (t * 1.6), y = e.y + 14 * cos (t * 2.2) * dt }

    else
        { e | t = t, x = e.home + 22 * sin (t * 1.1) }



-- VIEW


{-| A sprite: one string per row, one character per pixel. `.` is clear,
the others name a base16 slot.
-}
sprite : Float -> Float -> Bool -> List String -> List (Svg msg)
sprite x y flip rows =
    List.concat
        (List.indexedMap
            (\r row ->
                String.toList row
                    |> List.indexedMap Tuple.pair
                    |> List.filterMap
                        (\( c, ch ) ->
                            if ch == '.' then
                                Nothing

                            else
                                let
                                    col =
                                        if flip then
                                            String.length row - 1 - c

                                        else
                                            c
                                in
                                Just (Svg.rect [ SA.x (String.fromFloat (x + toFloat col)), SA.y (String.fromFloat (y + toFloat r)), SA.width "1", SA.height "1", SA.fill ("var(--base0" ++ String.fromChar ch ++ ")") ] [])
                        )
            )
            rows
        )


rook : List String
rook =
    [ "...FFFF...", "..FFFFFF..", "..F55B5F..", "..F5555F..", "...5555...", "..EEEEEE..", ".EEEBBEEE.", ".EE1BB1EE.", ".5E1111E5.", ".5.1111.5.", "...1111...", "...E11E...", "...EE.EE..", "...11.11..", "...11.11..", "...11.11..", "..111.111.", "..000.000." ]


drone : List String
drone =
    [ "..3333..", ".333333.", "33F33F33", "33333333", ".3.33.3.", "B..BB..B" ]


bot : List String
bot =
    [ "..8888..", ".888888.", ".8A88A8.", "88888888", "8.8888.8", "..8..8..", ".88..88." ]


view : Game -> Svg msg
view g =
    let
        cam =
            clamp 0 (width g.map - 256) (g.x - 110)

        f =
            String.fromFloat

        tiles =
            List.concat
                (List.indexedMap
                    (\r row ->
                        String.toList row
                            |> List.indexedMap Tuple.pair
                            |> List.filterMap
                                (\( c, ch ) ->
                                    let
                                        tx =
                                            toFloat c * tile
                                    in
                                    if tx + tile < cam || tx > cam + 256 then
                                        Nothing

                                    else
                                        case ch of
                                            '#' ->
                                                Just (Svg.g [] [ Svg.rect [ SA.x (f tx), SA.y (f (toFloat r * tile)), SA.width "16", SA.height "16", SA.class "wall" ] [], Svg.rect [ SA.x (f (tx + 1)), SA.y (f (toFloat r * tile + 1)), SA.width "14", SA.height "1", SA.class "edge" ] [] ])

                                            '=' ->
                                                Just (Svg.rect [ SA.x (f tx), SA.y (f (toFloat r * tile)), SA.width "16", SA.height "5", SA.class "ledge" ] [])

                                            'c' ->
                                                Just (Svg.text_ [ SA.x (f (tx + 8)), SA.y (f (toFloat r * tile + 14)), SA.class "check", SA.textAnchor "middle" ] [ Svg.text "⚑" ])

                                            'G' ->
                                                Just (Svg.rect [ SA.x (f tx), SA.y (f (toFloat r * tile - 16)), SA.width "16", SA.height "32", SA.class "gate" ] [])

                                            _ ->
                                                Nothing
                                )
                    )
                    g.map
                )

        skyline =
            List.map (\i -> Svg.rect [ SA.x (f (toFloat i * 23 - cam * 0.3 |> modFloat (width g.map * 0.3 + 256))), SA.y (f (60 + toFloat (modBy 5 (i * 7)) * 14)), SA.width "18", SA.height "200", SA.class "tower" ] []) (List.range 0 30)
    in
    Svg.g []
        [ Svg.g [] skyline
        , Svg.g [ SA.transform ("translate(" ++ f (negate cam) ++ " 0)") ]
            (tiles
                ++ List.map (\( x, y ) -> Svg.rect [ SA.x (f (x + 4)), SA.y (f (y + 4 + 2 * sin (g.t * 4))), SA.width "8", SA.height "8", SA.class "cell" ] []) g.cells
                ++ List.concatMap
                    (\e ->
                        if e.alive then
                            sprite e.x
                                e.y
                                False
                                (if e.kind == 'd' then
                                    drone

                                 else
                                    bot
                                )

                        else
                            []
                    )
                    g.enemies
                ++ (if g.hurt > 0 && modBy 2 (floor (g.t * 20)) == 0 then
                        []

                    else
                        sprite (g.x - 0) (g.y + 4) (g.facing < 0) rook
                   )
                ++ (if g.lashing > 0.12 then
                        [ Svg.rect
                            [ SA.x
                                (f
                                    (if g.facing > 0 then
                                        g.x + 10

                                     else
                                        g.x - 30
                                    )
                                )
                            , SA.y (f (g.y + 11))
                            , SA.width "30"
                            , SA.height "2"
                            , SA.class "lash"
                            ]
                            []
                        ]

                    else
                        []
                   )
            )
        , Svg.text_ [ SA.x "6", SA.y "12", SA.class "hud" ] [ Svg.text ("ROOK " ++ String.repeat g.energy "▮" ++ String.repeat (6 - g.energy) "▯") ]
        , Svg.text_ [ SA.x "250", SA.y "12", SA.class "hud", SA.textAnchor "end" ] [ Svg.text ("SCORE " ++ String.padLeft 6 '0' (String.fromInt g.score)) ]
        ]


modFloat : Float -> Float -> Float
modFloat m v =
    v - m * toFloat (floor (v / m))



-- STAGE FILES


type alias Stage =
    { pages : List String, ending : String, map : List String }


{-| Reads a stage file: `story` and `ending` lines, then `map` and the rows.
Short rows are padded, the map needs 15 rows, a gate and a floor under Rook.
-}
parse : String -> Result String Stage
parse src =
    let
        lines =
            String.lines src

        ( head, rows ) =
            ( takeWhile (\l -> String.trim l /= "map") lines, List.drop 1 (dropWhile (\l -> String.trim l /= "map") lines) )

        field key =
            List.filterMap
                (\l ->
                    if String.startsWith (key ++ " ") l then
                        Just (String.dropLeft (String.length key + 1) l)

                    else
                        Nothing
                )
                head

        grid =
            rows |> List.filter (\r -> String.trim r /= "" || True) |> List.take 15

        w =
            List.map String.length grid |> List.maximum |> Maybe.withDefault 0

        padded =
            List.map (String.padRight w ' ') grid

        has ch =
            List.any (String.contains (String.fromChar ch)) padded
    in
    if List.length (List.filter (\r -> String.trim r /= "") rows) == 0 then
        Err "the stage needs a line that says map, then the rows of the map"

    else if List.length grid < 15 then
        Err ("the map needs 15 rows, it has " ++ String.fromInt (List.length grid))

    else if w < 16 then
        Err "the map needs at least 16 columns"

    else if not (has 'G') then
        Err "the map needs a vault gate, G"

    else
        Ok { pages = field "story", ending = String.join " " (field "ending"), map = padded }


takeWhile : (a -> Bool) -> List a -> List a
takeWhile p xs =
    case xs of
        x :: rest ->
            if p x then
                x :: takeWhile p rest

            else
                []

        [] ->
            []


dropWhile : (a -> Bool) -> List a -> List a
dropWhile p xs =
    case xs of
        x :: rest ->
            if p x then
                dropWhile p rest

            else
                xs

        [] ->
            []
