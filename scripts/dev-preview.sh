#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="${HOME}/.local/node20/bin:/tmp/node-v22.14.0-darwin-x64/bin:$PATH"
ulimit -n 10240 || true
PORT="${1:-3000}"
exec npx next dev -H 127.0.0.1 -p "$PORT"
