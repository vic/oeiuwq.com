#!/bin/sh
# Records docs/demo.gif: starts oeiuwq in dev mode, plays demo/record.mjs in
# headless Chromium, and encodes the GIF.
#
#   nix shell nixpkgs#ffmpeg nixpkgs#gifsicle -c sh demo/record.sh [OUT.gif]
#
# Run it from the repo root, inside `nix develop`. It never deletes anything: the
# work directory is new each time, under the system temp directory.
set -eu

OUT=${1:-docs/demo.gif}
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/.." && pwd)
WORK=$(mktemp -d)
PORT=${OEIUWQ_DEMO_PORT:-7791}
CDP=${OEIUWQ_DEMO_CDP:-9391}
PIDS=""

echo "work dir: $WORK"
mkdir -p "$WORK/frames"
CGO_ENABLED=0 go build -o "$WORK/oeiuwq" "$ROOT/cmd/oeiuwq"

IP=127.0.0.1 PORT=$PORT "$WORK/oeiuwq" -dev >"$WORK/oeiuwq.log" 2>&1 &
PIDS="$PIDS $!"

chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --user-data-dir="$WORK/chrome" --remote-debugging-port="$CDP" about:blank >"$WORK/chrome.log" 2>&1 &
PIDS="$PIDS $!"

# shellcheck disable=SC2064
trap "kill $PIDS 2>/dev/null || true" EXIT INT TERM

# wait until both answer, at most 30 s
i=0
until curl -sf "http://127.0.0.1:$PORT/robots.txt" >/dev/null && curl -sf "http://127.0.0.1:$CDP/json" >/dev/null; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "oeiuwq or chromium did not start; see $WORK/*.log" >&2
    exit 1
  fi
  sleep 0.5
done

timeout 400 node "$HERE/record.mjs" "$CDP" "$PORT" "$WORK/frames"

echo "encoding"
cd "$WORK/frames"
ffmpeg -loglevel error -y -f concat -i frames.txt -vf "fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "$WORK/raw.gif"
mkdir -p "$(dirname "$ROOT/$OUT")"
gifsicle -O3 --lossy=70 "$WORK/raw.gif" -o "$ROOT/$OUT"
ls -l "$ROOT/$OUT"
