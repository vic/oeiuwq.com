module Common exposing
    ( Flags
    , Place
    , Repo
    , Scheme
    , Year
    , editor
    , flagsDecoder
    , fundUrl
    , getJson
    , keyDecoder
    , kofiUrl
    , onKey
    , places
    , placesBut
    , readme
    , readmeSource
    , repoDecoder
    , saveScheme
    , schemeCss
    , schemeDecoder
    , searchSchemes
    , site
    , siteLinks
    , socials
    , yearDecoder
    , yearOf
    )

import Browser.Events
import Dict exposing (Dict)
import Html exposing (Html)
import Html.Attributes
import Html.Events
import Http
import Json.Decode as D exposing (Decoder)
import Markdown
import Regex


type alias Flags =
    { scheme : String
    , sites : Dict String String
    , hash : String
    }


flagsDecoder : Decoder Flags
flagsDecoder =
    D.map3 Flags
        (D.field "scheme" D.string)
        (D.field "sites" (D.dict D.string))
        (D.oneOf [ D.field "hash" D.string, D.succeed "" ])


{-| The address of another subdomain ("codes", "home", ...), as the server named it.
-}
site : Flags -> String -> String
site flags name =
    Dict.get name flags.sites |> Maybe.withDefault "/"


{-| Turns the `site:<name>` and `site:<name>#<hash>` links of hand-written
markdown into the address of that site, so they work on the real domain and
on one dev server alike.
-}
siteLinks : Flags -> String -> String
siteLinks flags =
    Regex.replace (Regex.fromString "\\]\\(site:([a-z]+)" |> Maybe.withDefault Regex.never)
        (\m ->
            case m.submatches of
                [ Just name ] ->
                    "](" ++ site flags name

                _ ->
                    m.match
        )


fundUrl : String
fundUrl =
    "https://github.com/sponsors/vic"


kofiUrl : String
kofiUrl =
    "https://ko-fi.com/oeiuwq"


{-| Where vic is on the web, as the current oeiuwq.com links them.
-}
socials : List ( String, String )
socials =
    [ ( "GitHub", "https://github.com/vic" )
    , ( "Sponsor", fundUrl )
    , ( "Ko-fi", kofiUrl )
    , ( "Bluesky", "https://bsky.app/profile/oeiuwq.com" )
    , ( "X", "https://x.com/oeiuwq" )
    , ( "Nix Discourse", "https://discourse.nixos.org/u/vic/summary" )
    , ( "Email", "mailto:vborja@apache.org" )
    ]


type alias Repo =
    { fullName : String
    , owner : String
    , name : String
    , description : String
    , language : String
    , topics : List String
    , stars : Int
    , forks : Int
    , fork : Bool
    , archived : Bool
    , createdAt : String
    , pushedAt : String
    , url : String
    , homepage : String
    , starredAt : Maybe String
    }


andMap : Decoder a -> Decoder (a -> b) -> Decoder b
andMap =
    D.map2 (|>)


repoDecoder : Decoder Repo
repoDecoder =
    D.succeed Repo
        |> andMap (D.field "fullName" D.string)
        |> andMap (D.field "owner" D.string)
        |> andMap (D.field "name" D.string)
        |> andMap (D.field "description" D.string)
        |> andMap (D.field "language" D.string)
        |> andMap (D.field "topics" (D.list D.string))
        |> andMap (D.field "stars" D.int)
        |> andMap (D.field "forks" D.int)
        |> andMap (D.field "fork" D.bool)
        |> andMap (D.field "archived" D.bool)
        |> andMap (D.field "createdAt" D.string)
        |> andMap (D.field "pushedAt" D.string)
        |> andMap (D.field "url" D.string)
        |> andMap (D.field "homepage" D.string)
        |> andMap (D.maybe (D.field "starredAt" D.string))


{-| One year of public contributions: per-day counts and per-repo work.
-}
type alias Year =
    { year : Int
    , total : Int
    , days : List ( String, Int )
    , repos : List { repo : String, commits : Int, prs : Int, issues : Int }
    }


yearDecoder : Decoder Year
yearDecoder =
    D.map4 Year
        (D.field "year" D.int)
        (D.field "total" D.int)
        (D.field "days" (D.list (D.map2 Tuple.pair (D.field "date" D.string) (D.field "count" D.int))))
        (D.field "repos"
            (D.list
                (D.map4 (\r c p i -> { repo = r, commits = c, prs = p, issues = i })
                    (D.field "repo" D.string)
                    (D.field "commits" D.int)
                    (D.field "prs" D.int)
                    (D.field "issues" D.int)
                )
            )
        )


{-| The year of an ISO date such as "2014-05-01T10:00:00Z"; 0 when it has none.
-}
yearOf : String -> Int
yearOf iso =
    String.left 4 iso |> String.toInt |> Maybe.withDefault 0


getJson : String -> Decoder a -> (Result Http.Error a -> msg) -> Cmd msg
getJson url decoder toMsg =
    Http.get { url = url, expect = Http.expectJson toMsg decoder }


{-| Page-wide keys. While the visitor types in a text field, only the keys
that cannot be text reach the page: Escape, function keys, and in a one-line
input the up and down arrows.
-}
onKey : (String -> msg) -> Sub msg
onKey toMsg =
    Browser.Events.onKeyDown (D.map toMsg keyDecoder)


{-| The key of a keydown event, or a failure while it is text being typed.
-}
keyDecoder : Decoder String
keyDecoder =
    D.map2 Tuple.pair (D.field "key" D.string) (D.oneOf [ D.at [ "target", "tagName" ] D.string, D.succeed "" ])
        |> D.andThen
            (\( key, tag ) ->
                let
                    free =
                        key == "Escape" || (String.startsWith "F" key && String.length key > 1 && String.all Char.isDigit (String.dropLeft 1 key))
                in
                if free || not (List.member tag [ "INPUT", "TEXTAREA", "SELECT" ]) || (tag == "INPUT" && List.member key [ "ArrowUp", "ArrowDown" ]) then
                    D.succeed key

                else
                    D.fail "typing"
            )



-- COLOR SCHEMES


type alias Scheme =
    { id : String
    , name : String
    , variant : String
    , palette : Dict String String
    }


schemeDecoder : Decoder Scheme
schemeDecoder =
    D.map4 (\n s v p -> Scheme (s ++ "/" ++ v ++ "/" ++ n) n v p)
        (D.field "name" D.string)
        (D.field "system" D.string)
        (D.field "variant" D.string)
        (D.field "palette" (D.dict D.string))


{-| The `:root` colors of a scheme, to preview it before the server stores it.
Only the 16 base16 slots: every look is written against them.
-}
schemeCss : Scheme -> String
schemeCss s =
    ":root{"
        ++ String.concat
            (List.filterMap
                (\i ->
                    let
                        k =
                            "base0" ++ String.fromChar (String.toList "0123456789ABCDEF" |> List.drop i |> List.head |> Maybe.withDefault '0')
                    in
                    Dict.get k s.palette |> Maybe.map (\v -> "--" ++ k ++ ":" ++ v ++ ";")
                )
                (List.range 0 15)
            )
        ++ "}"


{-| Schemes whose id holds the letters of the query in order, ignoring case.
-}
searchSchemes : String -> List Scheme -> List Scheme
searchSchemes query =
    let
        want =
            String.toList (String.toLower (String.filter ((/=) ' ') query))
    in
    List.filter (\s -> inOrder want (String.toList (String.toLower s.id)))


inOrder : List Char -> List Char -> Bool
inOrder want text =
    case ( want, text ) of
        ( [], _ ) ->
            True

        ( _, [] ) ->
            False

        ( w :: ws, t :: ts ) ->
            if w == t then
                inOrder ws ts

            else
                inOrder want ts


{-| Stores the scheme in a cookie on the apex domain, so every subdomain uses it.
-}
saveScheme : (Result Http.Error () -> msg) -> String -> Cmd msg
saveScheme toMsg id =
    Http.post { url = "/api/theme", body = Http.stringBody "text/plain" id, expect = Http.expectWhatever toMsg }


{-| A README rendered as markdown. Raw HTML stays escaped, since READMEs come
from strangers, so the common tags are turned into markdown first:
`<img>` becomes an image, other tags go away. Relative links and images
point at the repository on GitHub.
-}
readme : String -> String -> Html msg
readme repo text =
    let
        opts =
            Markdown.defaultOptions
    in
    Markdown.toHtmlWith { opts | githubFlavored = Just { tables = True, breaks = False }, sanitize = True } [ Html.Attributes.class "readme" ] (readmeSource repo text)


{-| The markdown `readme` renders: HTML tags turned into markdown, links made absolute.
-}
readmeSource : String -> String -> String
readmeSource repo text =
    let
        re s =
            Regex.fromStringWith { caseInsensitive = True, multiline = False } s |> Maybe.withDefault Regex.never

        attr name tag =
            Regex.find (re (name ++ "\\s*=\\s*[\"']([^\"']*)[\"']")) tag |> List.head |> Maybe.andThen (.submatches >> List.head) |> Maybe.andThen identity

        img m =
            case attr "src" m.match of
                Just src ->
                    "![" ++ Maybe.withDefault "" (attr "alt" m.match) ++ "](" ++ src ++ ")"

                Nothing ->
                    ""

        absolute base m =
            case m.submatches of
                [ Just open, Just url ] ->
                    if Regex.contains (re "^([a-z]+:|#|//)") url then
                        m.match

                    else
                        open ++ base ++ String.replace "./" "" url ++ ")"

                _ ->
                    m.match
    in
    text
        |> Regex.replace (re "<img[^>]*>") img
        |> Regex.replace (re "<br\\s*/?>") (\_ -> "\n")
        |> Regex.replace (re "<!--[\\s\\S]*?-->|</?(p|div|a|span|picture|source|details|summary|h[1-6]|b|i|em|strong|sub|sup|center|table|tr|td|th|tbody|thead|kbd|hr|ul|ol|li|font|video)(\\s[^>]*)?/?>") (\_ -> "")
        |> Regex.replace (re "(!\\[[^\\]]*\\]\\()([^)\\s]+)\\)") (absolute ("https://raw.githubusercontent.com/" ++ repo ++ "/HEAD/"))
        |> Regex.replace (re "((?:^|[^!])\\[[^\\]]*\\]\\()([^)\\s]+)\\)") (absolute ("https://github.com/" ++ repo ++ "/blob/HEAD/"))


{-| The panel where a game's source is edited and run again. Every game
page shows it the same way; the page keeps the source in its own storage.
-}
editor :
    { title : String, help : String, source : String, error : Maybe String, onInput : String -> msg, onRun : msg, onReset : msg, onClose : msg }
    -> Html msg
editor e =
    Html.section [ Html.Attributes.class "editor" ]
        [ Html.header []
            [ Html.strong [] [ Html.text e.title ]
            , Html.button [ Html.Events.onClick e.onRun ] [ Html.text "▶ Run" ]
            , Html.button [ Html.Events.onClick e.onReset ] [ Html.text "Reset to original" ]
            , Html.button [ Html.Events.onClick e.onClose ] [ Html.text "Close" ]
            ]
        , Html.p [ Html.Attributes.class "editor-help" ] [ Html.text e.help ]
        , Html.textarea [ Html.Attributes.value e.source, Html.Events.onInput e.onInput, Html.Attributes.spellcheck False, Html.Attributes.attribute "aria-label" "Game source" ] []
        , case e.error of
            Just err ->
                Html.p [ Html.Attributes.class "editor-error" ] [ Html.text err ]

            Nothing ->
                Html.text ""
        ]


{-| One corner of oeiuwq.com, as every site lists the others: its name in
`site`, a title, a one-character glyph, and what is cool about it.
-}
type alias Place =
    { name : String, title : String, glyph : String, blurb : String }


places : List Place
places =
    [ Place "home" "oeiuwq.com" "⏻" "Boot menu. DEL picks the colors of every page"
    , Place "codes" "Codes" "▤" "Mac OS 9: every repo on a timeline, Datalog and μKanren"
    , Place "projects" "Projects" "▦" "Turbo IDE: open any of my projects as a file"
    , Place "stars" "Stars" "★" "GNOME 1: search the README of 4500 repos"
    , Place "blog" "Blog" "✎" "A BBS with posts on what I make and why"
    , Place "portfolio" "Portfolio" "◆" "NeXTSTEP: my CV and track record"
    , Place "smalltalk" "Smalltalk" "◎" "A Smalltalk-80 that lives in your browser"
    , Place "nes" "NEON VIGIL" "▲" "8-bit run and lash game, with a stage editor"
    , Place "adventure" "The Lost Commit" "›" "Text adventure on a 64, write your own story"
    , Place "sponsor" "Arcade" "$" "BUG HUNT, a game nobody loses. Fund the fun"
    , Place "faith" "Faith" "✝" "A HyperCard stack about faith and berean.faith"
    , Place "love" "Love" "♥" "A love letter in DOS EDIT. Write one back"
    ]


{-| Every place except the one the page is on.
-}
placesBut : String -> List Place
placesBut name =
    List.filter (\p -> p.name /= name) places
