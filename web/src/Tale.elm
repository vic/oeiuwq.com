module Tale exposing (Story, World, art, decode, defaultSource, encode, intro, new, parse, roomName, run)

{-| Text adventures for adventure.oeiuwq.com. A story is a small text file
(see `defaultSource`, THE LOST COMMIT) that anyone can edit in the page and
run again. The parser understands `go north`, `take all`, `drop lamp`,
`throw potato at drone`, `put disk in antenna`, `examine shelf`, `read`,
`drink`, `inventory`, `look`, `score`.
-}

import Dict exposing (Dict)
import Json.Decode as D
import Json.Encode as E
import Set exposing (Set)



-- STORIES


type alias Lock =
    { key : String, opened : String, closed : String }


type alias Room =
    { id : String, name : String, desc : String, art : List String, exits : List ( String, String ), lock : Maybe Lock, dark : Maybe ( String, String ) }


type alias Item =
    { id : String, names : List String, desc : String, takeable : Bool, at : String, read : Maybe String, drink : Maybe String }


type alias Guard =
    { item : String, guard : String, bait : String, watching : String, busy : String, distracted : String, blocked : String }


type alias Win =
    { item : String, target : String, text : List String }


type alias Story =
    { title : String, intro : List String, start : String, rooms : List Room, items : List Item, guards : List Guard, wins : List Win }


type Block
    = None
    | InRoom Room
    | InItem Item
    | InGuard Guard
    | InWin Win


{-| Reads a story file. A line starts with a keyword; `room`, `item`,
`guard` and `win` open a block, and the lines after them fill it in.
-}
parse : String -> Result String Story
parse src =
    let
        empty =
            { title = "", intro = [], start = "", rooms = [], items = [], guards = [], wins = [] }

        close block s =
            case block of
                None ->
                    s

                InRoom r ->
                    { s | rooms = s.rooms ++ [ r ] }

                InItem i ->
                    { s | items = s.items ++ [ i ] }

                InGuard g ->
                    { s | guards = s.guards ++ [ g ] }

                InWin w ->
                    { s | wins = s.wins ++ [ w ] }

        two text =
            case String.split "|" text of
                [ a, b ] ->
                    Just ( String.trim a, String.trim b )

                _ ->
                    Nothing

        step ( n, raw ) acc =
            acc
                |> Result.andThen
                    (\( s, block ) ->
                        let
                            line =
                                String.trimRight raw

                            ( key, rest ) =
                                case String.words line of
                                    k :: _ ->
                                        ( k, String.dropLeft (String.length k + 1) (String.trimLeft line) )

                                    [] ->
                                        ( "", "" )

                            fail msg =
                                Err ("line " ++ String.fromInt n ++ ": " ++ msg)

                            words =
                                String.words rest
                        in
                        case ( key, block ) of
                            ( "", _ ) ->
                                Ok ( s, block )

                            ( "#", _ ) ->
                                Ok ( s, block )

                            ( "title", _ ) ->
                                Ok ( { s | title = rest }, block )

                            ( "intro", _ ) ->
                                Ok ( { s | intro = s.intro ++ [ rest ] }, block )

                            ( "start", _ ) ->
                                Ok ( { s | start = rest }, block )

                            ( "room", _ ) ->
                                case words of
                                    id :: name ->
                                        Ok ( close block s, InRoom (Room id (String.join " " name) "" [] [] Nothing Nothing) )

                                    _ ->
                                        fail "room needs an id and a name"

                            ( "item", _ ) ->
                                case words of
                                    id :: _ ->
                                        Ok
                                            ( close block s
                                            , InItem
                                                (Item id
                                                    (String.dropLeft (String.length id) rest
                                                        |> String.split ","
                                                        |> List.map String.trim
                                                        |> List.filter ((/=) "")
                                                        |> (\ns ->
                                                                if List.isEmpty ns then
                                                                    [ id ]

                                                                else
                                                                    ns
                                                           )
                                                    )
                                                    ""
                                                    True
                                                    ""
                                                    Nothing
                                                    Nothing
                                                )
                                            )

                                    _ ->
                                        fail "item needs an id"

                            ( "guard", _ ) ->
                                case words of
                                    [ item, "by", guard, "until", bait ] ->
                                        Ok ( close block s, InGuard (Guard item guard bait "" "" "" "") )

                                    _ ->
                                        fail "write it as: guard ITEM by GUARD until BAIT"

                            ( "win", _ ) ->
                                case words of
                                    [ item, "in", target ] ->
                                        Ok ( close block s, InWin (Win item target []) )

                                    _ ->
                                        fail "write it as: win ITEM in TARGET"

                            ( "desc", InRoom r ) ->
                                Ok ( s, InRoom { r | desc = String.trim (r.desc ++ " " ++ rest) } )

                            ( "art", InRoom r ) ->
                                Ok ( s, InRoom { r | art = r.art ++ [ String.dropLeft 4 raw ] } )

                            ( "exit", InRoom r ) ->
                                case words of
                                    [ dir, to ] ->
                                        Ok ( s, InRoom { r | exits = r.exits ++ [ ( dir, to ) ] } )

                                    _ ->
                                        fail "write it as: exit DIRECTION ROOM"

                            ( "locked", InRoom r ) ->
                                case words of
                                    k :: _ ->
                                        case two (String.dropLeft (String.length k) rest) of
                                            Just ( o, c ) ->
                                                Ok ( s, InRoom { r | lock = Just (Lock k o c) } )

                                            Nothing ->
                                                fail "write it as: locked KEY text when it opens | text when it is locked"

                                    _ ->
                                        fail "locked needs a key item"

                            ( "dark", InRoom r ) ->
                                case words of
                                    light :: _ ->
                                        Ok ( s, InRoom { r | dark = Just ( light, String.trim (String.dropLeft (String.length light) rest) ) } )

                                    _ ->
                                        fail "dark needs the item that lights it"

                            ( "desc", InItem i ) ->
                                Ok ( s, InItem { i | desc = String.trim (i.desc ++ " " ++ rest) } )

                            ( "at", InItem i ) ->
                                Ok ( s, InItem { i | at = rest } )

                            ( "fixed", InItem i ) ->
                                Ok ( s, InItem { i | takeable = False } )

                            ( "read", InItem i ) ->
                                Ok ( s, InItem { i | read = Just rest } )

                            ( "drink", InItem i ) ->
                                Ok ( s, InItem { i | drink = Just rest } )

                            ( "watching", InGuard g ) ->
                                Ok ( s, InGuard { g | watching = rest } )

                            ( "busy", InGuard g ) ->
                                Ok ( s, InGuard { g | busy = rest } )

                            ( "distracted", InGuard g ) ->
                                Ok ( s, InGuard { g | distracted = rest } )

                            ( "blocked", InGuard g ) ->
                                Ok ( s, InGuard { g | blocked = rest } )

                            ( "text", InWin w ) ->
                                Ok ( s, InWin { w | text = w.text ++ [ rest ] } )

                            _ ->
                                fail ("I don't understand \"" ++ key ++ "\" here")
                    )
    in
    List.foldl step (Ok ( empty, None )) (List.indexedMap (\i l -> ( i + 1, l )) (String.lines src))
        |> Result.map (\( s, b ) -> close b s)
        |> Result.andThen check


{-| A story must start in a room, and exits and items must name real rooms.
-}
check : Story -> Result String Story
check s =
    let
        ids =
            List.map .id s.rooms

        bad =
            List.concatMap (\r -> List.filter (\( _, to ) -> not (List.member to ids)) r.exits |> List.map (\( d, to ) -> r.id ++ " has an exit " ++ d ++ " to a room \"" ++ to ++ "\" that does not exist")) s.rooms
                ++ List.filterMap
                    (\i ->
                        if List.member i.at ids then
                            Nothing

                        else
                            Just ("item " ++ i.id ++ " is at \"" ++ i.at ++ "\", which is not a room")
                    )
                    s.items
    in
    if not (List.member s.start ids) then
        Err ("start must name a room; \"" ++ s.start ++ "\" is not one")

    else
        case bad of
            first :: _ ->
                Err first

            [] ->
                Ok s



-- PLAYING


type alias World =
    { room : String
    , places : Dict String String
    , flags : Set String
    , moves : Int
    , score : Int
    , won : Bool
    }


carried : String
carried =
    "you"


new : Story -> World
new s =
    { room = s.start, places = Dict.fromList (List.map (\i -> ( i.id, i.at )) s.items), flags = Set.singleton ("seen-" ++ s.start), moves = 0, score = 0, won = False }


intro : Story -> List String
intro s =
    s.title :: "" :: s.intro ++ [ "", "Type HELP if you get stuck.", "" ]


room : Story -> String -> Maybe Room
room s id =
    List.filter (\r -> r.id == id) s.rooms |> List.head


roomName : Story -> String -> String
roomName s id =
    room s id |> Maybe.map .name |> Maybe.withDefault id


art : Story -> String -> List String
art s id =
    room s id |> Maybe.map .art |> Maybe.withDefault []


maxScore : Story -> Int
maxScore s =
    5 * List.length (List.filter .takeable s.items) + 10 * (List.length s.rooms - 1) + 15 * List.length s.guards + 50 * List.length s.wins


dark : Story -> World -> Bool
dark s w =
    case room s w.room |> Maybe.andThen .dark of
        Just ( light, _ ) ->
            Dict.get light w.places /= Just carried

        Nothing ->
            False


guarding : Story -> World -> List Guard
guarding s w =
    List.filter (\g -> Dict.get g.guard w.places == Just w.room && not (Set.member ("busy-" ++ g.guard) w.flags)) s.guards


describe : Story -> World -> List String
describe s w =
    case room s w.room of
        Nothing ->
            [ "You are nowhere." ]

        Just r ->
            if dark s w then
                [ r.name, r.dark |> Maybe.map Tuple.second |> Maybe.withDefault "It is too dark to see." ]

            else
                let
                    here =
                        visible s w |> List.filter .takeable

                    guardLines =
                        List.filterMap
                            (\g ->
                                if Dict.get g.guard w.places /= Just w.room then
                                    Nothing

                                else if Set.member ("busy-" ++ g.guard) w.flags then
                                    Just g.busy

                                else
                                    Just g.watching
                            )
                            s.guards
                            |> List.filter ((/=) "")
                in
                r.name
                    :: String.join " " (r.desc :: guardLines)
                    :: (if List.isEmpty here then
                            []

                        else
                            [ "You can see " ++ listNames here ++ " here." ]
                       )


firstName : Item -> String
firstName i =
    List.head i.names |> Maybe.withDefault i.id


listNames : List Item -> String
listNames is =
    case List.map (\i -> "a " ++ firstName i) is of
        [] ->
            "nothing"

        [ one ] ->
            one

        many ->
            String.join ", " (List.take (List.length many - 1) many) ++ " and " ++ (List.reverse many |> List.head |> Maybe.withDefault "")


visible : Story -> World -> List Item
visible s w =
    List.filter (\i -> Dict.get i.id w.places == Just w.room) s.items


inventory : Story -> World -> List Item
inventory s w =
    List.filter (\i -> Dict.get i.id w.places == Just carried) s.items


find : Story -> World -> String -> Maybe Item
find s w noun =
    List.filter (\i -> List.member noun i.names || noun == i.id) (inventory s w ++ visible s w) |> List.head


directions : Dict String String
directions =
    Dict.fromList [ ( "n", "north" ), ( "s", "south" ), ( "e", "east" ), ( "w", "west" ), ( "u", "up" ), ( "d", "down" ), ( "north", "north" ), ( "south", "south" ), ( "east", "east" ), ( "west", "west" ), ( "up", "up" ), ( "down", "down" ), ( "upstairs", "up" ), ( "downstairs", "down" ) ]


award : String -> Int -> World -> World
award flag points w =
    if Set.member ("scored-" ++ flag) w.flags then
        w

    else
        { w | score = w.score + points, flags = Set.insert ("scored-" ++ flag) w.flags }


{-| In the dark you can only go back to rooms you have already seen.
-}
go : Story -> String -> World -> ( World, List String )
go s dir w =
    case room s w.room |> Maybe.map .exits |> Maybe.withDefault [] |> List.filter (\( d, _ ) -> d == dir) |> List.head of
        Nothing ->
            ( w, [ "You can't go that way." ] )

        Just ( _, to ) ->
            if dark s w && not (Set.member ("seen-" ++ to) w.flags) then
                ( w, [ "You won't go somewhere new in the dark." ] )

            else
                case room s to |> Maybe.andThen .lock of
                    Just lock ->
                        if Dict.get lock.key w.places == Just carried then
                            enter s to w |> Tuple.mapSecond ((::) lock.opened)

                        else
                            ( w, [ lock.closed ] )

                    Nothing ->
                        enter s to w


enter : Story -> String -> World -> ( World, List String )
enter s to w =
    let
        w2 =
            award ("room-" ++ to) 10 { w | room = to, flags = Set.insert ("seen-" ++ to) w.flags }
    in
    ( w2, describe s w2 )


take : Story -> Item -> World -> ( World, List String )
take s i w =
    if Dict.get i.id w.places == Just carried then
        ( w, [ "You already have it." ] )

    else if not i.takeable then
        ( w, [ "That is not something you can carry." ] )

    else
        case List.filter (\g -> g.item == i.id) (guarding s w) |> List.head of
            Just g ->
                ( w, [ g.blocked ] )

            Nothing ->
                ( award ("item-" ++ i.id) 5 { w | places = Dict.insert i.id carried w.places }, [ "Taken." ] )


throw : Story -> Item -> Maybe Item -> World -> ( World, List String )
throw s i target w =
    if Dict.get i.id w.places /= Just carried then
        ( w, [ "You aren't holding that." ] )

    else
        let
            dropped =
                { w | places = Dict.insert i.id w.room w.places }
        in
        case List.filter (\g -> g.bait == i.id) (guarding s w) |> List.head of
            Just g ->
                ( award ("busy-" ++ g.guard) 15 { dropped | flags = Set.insert ("busy-" ++ g.guard) w.flags }, [ g.distracted ] )

            Nothing ->
                ( dropped
                , [ case target of
                        Just t ->
                            "The " ++ firstName i ++ " hits the " ++ firstName t ++ " and falls to the floor. Nothing else happens."

                        Nothing ->
                            "Thrown. It lands on the floor."
                  ]
                )


put : Story -> Item -> Item -> World -> ( World, List String )
put s i target w =
    if Dict.get i.id w.places /= Just carried then
        ( w, [ "You aren't holding that." ] )

    else
        case List.filter (\v -> v.item == i.id && v.target == target.id) s.wins |> List.head of
            Just v ->
                ( award ("win-" ++ v.item) 50 { w | places = Dict.insert i.id "gone" w.places, won = True }, v.text ++ [ "", "*** You have won ***", "", "Thanks for playing. Type EDIT to change this story, or SPONSOR." ] )

            Nothing ->
                ( w, [ "That doesn't fit there." ] )


noise : List String
noise =
    [ "the", "a", "an", "at", "to", "on", "into", "in", "with", "from", "up", "please" ]


help : List String
help =
    [ "Talk to me in short commands, like:"
    , "  LOOK, INVENTORY (I), NORTH (N), SOUTH, EAST, WEST, UP, DOWN"
    , "  TAKE LAMP, TAKE ALL, DROP POTATO, EXAMINE SHELF (X SHELF)"
    , "  THROW POTATO AT DRONE, PUT DISK IN ANTENNA, READ BOOK, DRINK COFFEE"
    , "  SCORE, RESTART. EDIT opens the story file. The game saves itself."
    ]


{-| Runs one command line on a story.
-}
run : Story -> String -> World -> ( World, List String )
run s line w0 =
    let
        words =
            String.words (String.toLower (String.filter (\c -> Char.isAlphaNum c || c == ' ') line))

        w =
            { w0 | moves = w0.moves + 1 }

        noun ws =
            String.join " " (List.filter (\x -> not (List.member x noise)) ws)

        withItem ws f =
            case find s w (noun ws) of
                Just i ->
                    f i

                Nothing ->
                    if noun ws == "" then
                        ( w0, [ "What do you want to do that with?" ] )

                    else if dark s w then
                        ( w, [ "It is too dark to find anything." ] )

                    else
                        ( w0, [ "You don't see any " ++ noun ws ++ " here." ] )

        split sep ws =
            ( takeWhile ((/=) sep) ws, List.drop 1 (dropWhile ((/=) sep) ws) )

        drop i =
            if Dict.get i.id w.places == Just carried then
                ( { w | places = Dict.insert i.id w.room w.places }, [ "Dropped." ] )

            else
                ( w0, [ "You aren't holding that." ] )
    in
    if w0.won && not (List.member words [ [ "restart" ], [ "sponsor" ], [ "edit" ] ]) then
        ( w0, [ "You already won. Type RESTART to play again, EDIT to change the story, or SPONSOR." ] )

    else
        case words of
            [] ->
                ( w0, [ "Say something." ] )

            [ d ] ->
                case Dict.get d directions of
                    Just dir ->
                        go s dir w

                    Nothing ->
                        single s d w w0

            [ "go", d ] ->
                case Dict.get d directions of
                    Just dir ->
                        go s dir w

                    Nothing ->
                        ( w0, [ "Go where? Try north, south, east, west, up or down." ] )

            [ "take", "all" ] ->
                takeAll s w

            [ "get", "all" ] ->
                takeAll s w

            "take" :: rest ->
                withItem rest (\i -> take s i w)

            "get" :: rest ->
                withItem rest (\i -> take s i w)

            "pick" :: rest ->
                withItem rest (\i -> take s i w)

            "drop" :: rest ->
                withItem rest drop

            "throw" :: rest ->
                let
                    ( what, at ) =
                        split "at" rest
                in
                withItem what (\i -> throw s i (find s w (noun at)) w)

            "put" :: rest ->
                let
                    ( what, into ) =
                        split "in" rest
                in
                withItem what (\i -> withItem into (\t -> put s i t w))

            "insert" :: rest ->
                withItem rest (\i -> useOn s i w)

            "use" :: rest ->
                withItem rest (\i -> useOn s i w)

            "examine" :: rest ->
                withItem rest (\i -> ( w, [ i.desc ] ))

            "x" :: rest ->
                withItem rest (\i -> ( w, [ i.desc ] ))

            "look" :: "at" :: rest ->
                withItem rest (\i -> ( w, [ i.desc ] ))

            "read" :: rest ->
                withItem rest (\i -> ( w, [ Maybe.withDefault i.desc i.read ] ))

            "drink" :: rest ->
                withItem rest
                    (\i ->
                        case i.drink of
                            Just text ->
                                ( { w | places = Dict.insert i.id "gone" w.places }, [ text ] )

                            Nothing ->
                                ( w0, [ "That's not a drink." ] )
                    )

            _ ->
                ( w0, [ "I don't know how to \"" ++ line ++ "\". Type HELP for ideas." ] )


{-| `use disk` puts it in whatever here wins with it.
-}
useOn : Story -> Item -> World -> ( World, List String )
useOn s i w =
    case List.filter (\v -> v.item == i.id) s.wins |> List.filterMap (\v -> find s w v.target) |> List.head of
        Just t ->
            put s i t w

        Nothing ->
            ( w, [ "You can't think of a way to use that here." ] )


single : Story -> String -> World -> World -> ( World, List String )
single s word w w0 =
    case word of
        "look" ->
            ( w, describe s w )

        "l" ->
            ( w, describe s w )

        "inventory" ->
            ( w0, inventoryText s w )

        "i" ->
            ( w0, inventoryText s w )

        "help" ->
            ( w0, help )

        "score" ->
            ( w0, [ "Your score is " ++ String.fromInt w.score ++ " of " ++ String.fromInt (maxScore s) ++ ", in " ++ String.fromInt w0.moves ++ " moves." ] )

        "wait" ->
            ( w, [ "Time passes." ] )

        "z" ->
            ( w, [ "Time passes." ] )

        "restart" ->
            ( new s, intro s ++ describe s (new s) )

        "sponsor" ->
            ( w0, [ "Opening the sponsor page. Thank you <3" ] )

        "edit" ->
            ( w0, [ "Opening the story file." ] )

        "xyzzy" ->
            ( w0, [ "A hollow voice says: \"star the repo.\"" ] )

        _ ->
            ( w0, [ "I don't know the word \"" ++ word ++ "\". Type HELP for ideas." ] )


inventoryText : Story -> World -> List String
inventoryText s w =
    case inventory s w of
        [] ->
            [ "You are empty-handed." ]

        is ->
            "You are carrying:" :: List.map (\i -> "  " ++ firstName i) is


takeAll : Story -> World -> ( World, List String )
takeAll s w =
    let
        here =
            visible s w |> List.filter .takeable
    in
    if dark s w then
        ( w, [ "It is too dark to find anything." ] )

    else if List.isEmpty here then
        ( w, [ "There is nothing here to take." ] )

    else
        List.foldl (\i ( ww, out ) -> take s i ww |> Tuple.mapSecond (\said -> out ++ List.map (\t -> firstName i ++ ": " ++ t) said)) ( w, [] ) here


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



-- SAVING


encode : World -> E.Value
encode w =
    E.object
        [ ( "room", E.string w.room )
        , ( "places", E.dict identity E.string w.places )
        , ( "flags", E.list E.string (Set.toList w.flags) )
        , ( "moves", E.int w.moves )
        , ( "score", E.int w.score )
        , ( "won", E.bool w.won )
        ]


decode : D.Decoder World
decode =
    D.map6 World
        (D.field "room" D.string)
        (D.field "places" (D.dict D.string))
        (D.field "flags" (D.list D.string) |> D.map Set.fromList)
        (D.field "moves" D.int)
        (D.field "score" D.int)
        (D.field "won" D.bool)



-- THE LOST COMMIT


defaultSource : String
defaultSource =
    """# THE LOST COMMIT, a story file. Edit it and press RUN.
# A line starts with a keyword. room, item, guard and win open a block;
# the lines under them (desc, art, exit, at, ...) fill it in.

title THE LOST COMMIT
intro Last night a commit vanished from the public code vault. Without it, nothing builds.
intro Tonight you will find it and push it back where it belongs.
start apartment

room apartment Your Apartment
desc A small apartment that smells of coffee and solder. A desk faces the window.
desc The kitchen is east, and the door north opens to the hallway.
art    _______________
art   |  ___________  |  *
art   | |  > _      | | /|\\
art   | |___________| |  |
art   |_______________| /_\\
exit east kitchen
exit north hallway

room kitchen Kitchen
desc A narrow kitchen. The fridge has a magnet shaped like a lambda. The apartment is back west.
art    ______    ( )
art   |[]  []|  (   )
art   |  __  |   \\_/
art   |_|__|_|  [MUG]
exit west apartment

room hallway Hallway
desc A long hallway. A steel vault door is set in the east wall.
desc The library is west, a stairwell goes north, and your apartment is south.
art  |       |   [=]   |
art  |  ^    | [VAULT] |
art  | stair | |#####| |
art  |_______|_|#####|_|
exit south apartment
exit west library
exit north stairwell
exit east vault

room library Library
desc A quiet room lined with shelves. A reading table stands in the middle. The hallway is east.
art   |=|=|=|=|=| |=|=|
art   |=|=|=|=|=| |=|=|
art   |=|=|=|=|=|_|=|=|
art   |___________|___|
exit east hallway

room vault Server Vault
desc Racks of servers blink in the cold. The hallway is west.
locked keycard The card reader beeps green and the steel door slides open. | The vault door is locked. The card reader blinks red.
art   [|||] [|||] [|||]
art   [|||]  (o)  [|||]
art   [|||] /|=|\\ [|||]
art   [|||]  ' '  [|||]
exit west hallway

room stairwell Stairwell
desc Your lamp paints the concrete purple. The stairs go up to the rooftop, and the hallway is back south.
dark lamp It is too dark to see. Something hums in the dark, very close.
art         __|
art      __|
art   __|
art  |
exit south hallway
exit up rooftop

room rooftop Rooftop
desc The roof is wet with rain. The whole city glows below you. An old uplink antenna points at the sky. The stairwell is down.
art    *    .   *     .
art       ___/|\\___  *
art   .  |  UPLINK  |
art  _____|________|_____
exit down stairwell

item lamp lamp, purple lamp, light
at apartment
desc A small lamp that glows Rebecca purple. It is warm and steady.

item keyboard keyboard, glove80, split keyboard
at apartment
desc A split ergonomic keyboard with too many custom layers.

item potato potato, spud
at kitchen
desc A perfectly ordinary potato. Someone wrote on it in marker: "Hey, here's a potato."

item mug mug, coffee, cup
at kitchen
desc A mug of black coffee, still hot. It says I <3 NIX.
drink You drink the coffee and feel ready to fix anything. You leave the empty mug behind.

item keycard keycard, card, key
at library
desc A keycard on a lanyard. The badge says: VAULT ACCESS - MAINTAINER.

item book book, bibliography
at library
desc A thick binder titled THE EFFECTS BIBLIOGRAPHY.
read "An effect is a request, a handler is the answer." Someone underlined it twice.

item shelf shelf, shelves
at library
fixed
desc Shelves full of papers on type theory, interaction nets and theology.

item disk disk, floppy, commit, lost commit
at vault
desc A purple floppy disk. The label says: "the lost commit - do not lose again".

item drone drone, security drone, robot
at vault
fixed
desc A security drone with one red eye. It watches you.

item antenna antenna, dish, uplink
at rooftop
fixed
desc An old satellite uplink with a floppy slot on its side. A sticker says PUSH TO ORIGIN.

guard disk by drone until potato
watching A security drone hovers in front of the main rack, its red eye fixed on you.
busy The drone is in a corner, very busy with a potato.
distracted The potato rolls into the corner. The drone spins around and follows it with total devotion.
blocked The drone's red eye locks onto you and it buzzes loudly. It needs something else to look at.

win disk in antenna
text You slide the floppy into the uplink. The antenna turns to the sky and a tiny screen says:
text
text   PUSHING TO ORIGIN... 1 commit... DONE
text
text Down in the city, ten thousand builds turn green at once.
"""
