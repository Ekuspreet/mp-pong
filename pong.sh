#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"
CLIENT_DIR="$PROJECT_ROOT/client"
PIDS=()

for project_dir in "$SERVER_DIR" "$CLIENT_DIR"; do
  if [[ ! -d "$project_dir/node_modules" ]]; then
    echo "Missing dependencies in $project_dir. Run npm install from that directory first." >&2
    exit 1
  fi
done

cleanup() {
  trap - EXIT INT TERM
  if ((${#PIDS[@]})); then
    kill "${PIDS[@]}" 2>/dev/null || true
    wait "${PIDS[@]}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting Polygon Pong server..."
(cd "$SERVER_DIR" && npm run dev) &
PIDS+=("$!")

echo "Starting Polygon Pong client..."
(cd "$CLIENT_DIR" && npm run dev) &
PIDS+=("$!")

set +e
wait -n "${PIDS[@]}"
STATUS=$?
set -e

exit "$STATUS"
