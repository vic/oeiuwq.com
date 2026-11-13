module CommonTest exposing (suite)

import Common
import Dict
import Expect
import Json.Decode as D
import Test exposing (Test, describe, test)


key : String -> String -> Result D.Error String
key k tag =
    D.decodeString Common.keyDecoder ("{\"key\":\"" ++ k ++ "\",\"target\":{\"tagName\":\"" ++ tag ++ "\"}}")


scheme : String -> Common.Scheme
scheme name =
    { id = "base16/dark/" ++ name, name = name, variant = "dark", palette = Dict.empty }


suite : Test
suite =
    describe "all" [ commonSuite, readmeSuite ]


commonSuite : Test
commonSuite =
    describe "Common"
        [ describe "keyDecoder"
            [ test "page keys pass outside text fields" <|
                \_ -> key "Backspace" "BODY" |> Expect.equal (Ok "Backspace")
            , test "typing in an input does not reach the page" <|
                \_ -> key "Backspace" "INPUT" |> Expect.err
            , test "typing in a textarea does not reach the page" <|
                \_ -> key "q" "TEXTAREA" |> Expect.err
            , test "Escape and function keys pass from a textarea" <|
                \_ -> List.map (\k -> key k "TEXTAREA") [ "Escape", "F2", "F10" ] |> Expect.equal [ Ok "Escape", Ok "F2", Ok "F10" ]
            , test "a key named F plus letters is text" <|
                \_ -> key "Fo" "TEXTAREA" |> Expect.err
            , test "arrows pass from a one-line input only" <|
                \_ -> ( key "ArrowDown" "INPUT", key "ArrowDown" "TEXTAREA" |> Result.toMaybe ) |> Expect.equal ( Ok "ArrowDown", Nothing )
            ]
        , describe "searchSchemes"
            [ test "letters in order, any case" <|
                \_ ->
                    Common.searchSchemes "RBC" [ scheme "Rebecca", scheme "Monokai", scheme "Cobalt" ]
                        |> List.map .name
                        |> Expect.equal [ "Rebecca" ]
            , test "an empty query keeps every scheme" <|
                \_ -> Common.searchSchemes "" [ scheme "A", scheme "B" ] |> List.length |> Expect.equal 2
            ]
        , test "schemeCss writes only the 16 base16 slots" <|
            \_ ->
                Common.schemeCss { id = "x", name = "x", variant = "dark", palette = Dict.fromList [ ( "base00", "#000000" ), ( "base0F", "#ffffff" ), ( "base10", "#123456" ) ] }
                    |> Expect.equal ":root{--base00:#000000;--base0F:#ffffff;}"
        , test "yearOf reads ISO dates" <|
            \_ -> List.map Common.yearOf [ "2014-05-01T10:00:00Z", "" ] |> Expect.equal [ 2014, 0 ]
        ]


readmeSuite : Test
readmeSuite =
    describe "readmeSource"
        [ test "an img tag becomes a markdown image on raw GitHub" <|
            \_ -> Common.readmeSource "vic/x" "<p align=\"center\"><img src=\"docs/a.png\" alt=\"A\"></p>" |> Expect.equal "![A](https://raw.githubusercontent.com/vic/x/HEAD/docs/a.png)"
        , test "a relative link points at the repo, an absolute one stays" <|
            \_ -> Common.readmeSource "vic/x" "see [docs](./docs/README.md) and [site](https://x.dev) and [top](#install)" |> Expect.equal "see [docs](https://github.com/vic/x/blob/HEAD/docs/README.md) and [site](https://x.dev) and [top](#install)"
        , test "generics in text are kept" <|
            \_ -> Common.readmeSource "vic/x" "a `Vec<String>` and <b>bold</b>" |> Expect.equal "a `Vec<String>` and bold"
        ]
