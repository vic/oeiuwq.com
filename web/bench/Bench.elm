port module Bench exposing (main)

{-| Times the logic presets on the real data, in node: `just bench`.
-}

import Common
import Datalog exposing (Db)
import Dict
import Facts
import Horn
import Json.Decode as D
import Logic


port run : (String -> msg) -> Sub msg


port done : String -> Cmd msg


main : Program D.Value Db String
main =
    Platform.worker
        { init =
            \v ->
                let
                    list field dec =
                        D.decodeValue (D.field field (D.list dec)) v |> Result.withDefault []
                in
                ( Facts.local (list "repos" Common.repoDecoder) (list "stars" Common.repoDecoder) (list "contrib" Common.yearDecoder), Cmd.none )
        , update =
            \arg db ->
                let
                    i =
                        String.toInt arg |> Maybe.withDefault -1

                    pick =
                        if i >= 0 then
                            List.drop i Logic.presets |> List.head

                        else
                            Just ( "adhoc", Logic.Bottom, arg )
                in
                ( db
                , case pick of
                    Just ( title, engine, src ) ->
                        done
                            (title
                                ++ " | "
                                ++ (case Horn.parse src of
                                        Err e ->
                                            "syntax " ++ e

                                        Ok p ->
                                            if List.isEmpty (Logic.needs (\_ -> False) p) then
                                                case Logic.solve engine db p of
                                                    Ok o ->
                                                        o.stats

                                                    Err e ->
                                                        "error " ++ e

                                            else
                                                "skipped: needs GH Archive"
                                   )
                            )

                    Nothing ->
                        done "end"
                )
        , subscriptions = \_ -> run identity
        }
