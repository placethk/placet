#!/bin/bash
# Placet knowledge-base preflight (shell wrapper around the Node implementation)
#
# Usage:
#   bash preflight-kb.sh <project-root> [--build] [--rebuild] [--json]
#
# Default is a lightweight probe; it does not run codegraph build. For large
# projects, first show SOURCE_FILE_COUNT / IS_LARGE_PROJECT / CODEGRAPH_STATUS /
# RECOMMENDED_ACTION, then add --build after the user confirms.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_SCRIPT="$SCRIPT_DIR/preflight-kb.js"

if [ ! -f "$NODE_SCRIPT" ]; then
    echo "PREFLIGHT_STATUS=ERROR"
    echo "MESSAGE=preflight-kb.js not found at $NODE_SCRIPT"
    exit 2
fi

exec node "$NODE_SCRIPT" "$@"
