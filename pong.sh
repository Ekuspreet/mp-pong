#!/usr/bin/env bash

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

prefix() {
    local name="$1"

    while IFS= read -r line; do
        printf '[%s: %(%H:%M:%S)T] %s\n' "$name" -1 "$line"
    done
}

cleanup() {
    kill $(jobs -pr) 2>/dev/null || true
}

trap cleanup INT TERM EXIT

(
    cd "$PROJECT_ROOT/server"
    npm run dev
) 2>&1 | prefix "server" &

(
    cd "$PROJECT_ROOT/client"
    npm run dev
) 2>&1 | prefix "client" &

wait