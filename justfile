default:
    @just --list

apps := "Hub Codes Projects Smalltalk Nes Adventure Portfolio Blog Faith Love Sponsor Stars"

# Elm bundles, embedded into the Go binary
web:
    cd web && for a in {{apps}}; do elm make src/$a.elm --optimize --output=../internal/site/static/js/$a.js || exit 1; done

build: web
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/oeiuwq ./cmd/oeiuwq

# Public GitHub data into data/ (needs gh auth or GITHUB_TOKEN)
fetch:
    go run ./cmd/fetch

test:
    go test -timeout 30s ./...
    cd web && elm-test

lint:
    go vet ./...
    test -z "$(gofmt -l cmd internal data content)"
    cd web && elm-format --validate src tests bench

fmt:
    gofmt -w cmd internal data content
    cd web && elm-format --yes src tests bench
    nixfmt flake.nix

run *args="": build
    bin/oeiuwq {{args}}

port := env("PORT", "8080")

# Every site on one local server, no subdomains: links become /?site=<name>
dev: build
    IP=127.0.0.1 PORT={{port}} bin/oeiuwq -dev

# dev, rebuilt and restarted on every change to the Elm, Go, CSS or content
watch:
    watchexec --restart --exts elm,go,css,md,json --ignore 'internal/site/static/js/**' -- just dev

# The committed bundles must match the Elm source
bundle-fresh:
    cd web && for a in {{apps}}; do elm make src/$a.elm --optimize --output=/tmp/oeiuwq-$a.js >/dev/null && cmp /tmp/oeiuwq-$a.js ../internal/site/static/js/$a.js || exit 1; done

# Times every logic preset on the real data, in node
bench:
    cd web && elm make bench/Bench.elm --optimize --output=/tmp/oeiuwq-bench.js >/dev/null && node bench/run.js /tmp/oeiuwq-bench.js ../data

# Re-record docs/demo.gif: a tour of every site (needs a few minutes)
demo:
    nix shell nixpkgs#ffmpeg nixpkgs#gifsicle -c sh demo/record.sh docs/demo.gif
