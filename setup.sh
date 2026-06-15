#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Dependency checks ---
for dep in node npm gh git; do
  if ! command -v "$dep" &>/dev/null; then
    echo "Error: '$dep' is required but not installed." >&2
    case "$dep" in
      node|npm) echo "  Install Node.js: brew install node" >&2 ;;
      gh)       echo "  Install GitHub CLI: brew install gh" >&2 ;;
    esac
    exit 1
  fi
done

# --- Install npm deps if needed ---
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "Installing dependencies..."
  (cd "$SCRIPT_DIR" && npm install --silent)
fi

# --- Start server ---
PORT_FILE=$(mktemp /tmp/git-account-setup.XXXXXX)
rm -f "$PORT_FILE"

cleanup() { kill "$NODE_PID" 2>/dev/null; rm -f "$PORT_FILE"; }
trap cleanup EXIT

PORT_FILE="$PORT_FILE" node "$SCRIPT_DIR/server.js" &
NODE_PID=$!

# Wait up to 5s for server to write its port
for _ in $(seq 50); do
  sleep 0.1
  [ -f "$PORT_FILE" ] && break
done

PORT=$(cat "$PORT_FILE" 2>/dev/null)
if [ -z "$PORT" ]; then
  echo "Error: Server failed to start." >&2
  exit 1
fi

echo "Opening http://localhost:$PORT ..."
open "http://localhost:$PORT"

# Wait for server to exit (user clicked Done)
wait "$NODE_PID"
