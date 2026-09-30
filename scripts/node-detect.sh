#!/bin/bash
# Cross-platform Node.js detection (Git Bash / macOS / Linux)
# Usage: source scripts/node-detect.sh && node_detect_init
#
# Git Bash pitfall: command -v node returns alias node='winpty node.exe'
# That is not an executable path — this script uses where.exe / node.exe / run_node instead

strip_crlf() {
    tr -d '\r\n'
}

normalize_path() {
    local p
    p=$(strip_crlf)
    [ -n "$p" ] || return 0
    if command -v cygpath &>/dev/null; then
        case "$p" in
            [A-Za-z]:\\*|[A-Za-z]:/*)
                cygpath -u "$p" 2>/dev/null && return 0
                ;;
        esac
    fi
    echo "$p" | sed 's|\\|/|g'
}

first_existing_where() {
    local name="$1"
    local p
    command -v where.exe &>/dev/null || return 1
    while IFS= read -r p; do
        p=$(printf "%s" "$p" | normalize_path)
        if [ -n "$p" ] && [ -f "$p" ]; then
            echo "$p"
            return 0
        fi
    done < <(where.exe "$name" 2>/dev/null)
    return 1
}

# Actually run node (do not treat an alias string as a path)
run_node() {
    local p=""

    # Windows: prefer where.exe to get the real node.exe
    p=$(first_existing_where node)
    if [ -n "$p" ]; then
        "$p" "$@"
        return $?
    fi

    for p in \
        "/d/nodejs/node.exe" \
        "/c/Program Files/nodejs/node.exe" \
        "/c/Program Files (x86)/nodejs/node.exe" \
        "$PROGRAMFILES/nodejs/node.exe" \
        "${PROGRAMFILES:-}/nodejs/node.exe" \
        "${PROGRAMFILES:-} (x86)/nodejs/node.exe"
    do
        if [ -n "$p" ] && [ -f "$p" ]; then
            "$p" "$@"
            return $?
        fi
    done

    # which must return a file path, not alias text
    p=$(which node 2>/dev/null | head -1 | normalize_path)
    if [ -n "$p" ] && [ -f "$p" ]; then
        "$p" "$@"
        return $?
    fi

    # Common on Git Bash: alias node='winpty node.exe'
    if command -v winpty &>/dev/null; then
        if command -v node.exe &>/dev/null; then
            winpty node.exe "$@"
            return $?
        fi
        p=$(first_existing_where node.exe)
        if [ -n "$p" ]; then
            winpty "$p" "$@"
            return $?
        fi
    fi

    if command -v node.exe &>/dev/null; then
        node.exe "$@"
        return $?
    fi

    # Last resort: bare node (in some environments the alias still expands in a subshell)
    if type node &>/dev/null; then
        node "$@"
        return $?
    fi

    return 127
}

# Return an executable path for logs (never return an alias string)
resolve_node_cmd() {
    local p=""
    local via=""

    p=$(first_existing_where node)
    if [ -n "$p" ]; then
        echo "$p"
        return 0
    fi

    for p in \
        "/d/nodejs/node.exe" \
        "/c/Program Files/nodejs/node.exe" \
        "/c/Program Files (x86)/nodejs/node.exe" \
        "$PROGRAMFILES/nodejs/node.exe"
    do
        if [ -n "$p" ] && [ -f "$p" ]; then
            echo "$p"
            return 0
        fi
    done

    p=$(which node 2>/dev/null | head -1 | normalize_path)
    if [ -n "$p" ] && [ -f "$p" ]; then
        echo "$p"
        return 0
    fi

    if command -v node.exe &>/dev/null; then
        p=$(first_existing_where node.exe)
        if [ -n "$p" ]; then
            echo "$p"
            return 0
        fi
        echo "node.exe"
        return 0
    fi

    via=$(command -v node 2>/dev/null | normalize_path)
    case "$via" in
        alias\ *)
            # Display only; actual execution goes through run_node
            echo "node (shell alias)"
            return 0
            ;;
        "")
            return 1
            ;;
        *)
            if [ -f "$via" ] || [ -x "$via" ]; then
                echo "$via"
                return 0
            fi
            echo "node"
            return 0
            ;;
    esac
}

get_node_semver() {
    run_node -p "process.versions.node" 2>/dev/null | strip_crlf
}

# version_ge <current> <required>  —  current >= required
version_ge() {
    local cur="$1" req="$2"
    [ -z "$cur" ] || [ -z "$req" ] && return 1
    run_node -e "
const v='$cur'.split('.').map(n=>parseInt(n,10)||0);
const r='$req'.split('.').map(n=>parseInt(n,10)||0);
for(let i=0;i<3;i++){
  const a=v[i]||0, b=r[i]||0;
  if(a>b) process.exit(0);
  if(a<b) process.exit(1);
}
process.exit(0);
" 2>/dev/null
}

node_detect_init() {
    NODE_CMD=""
    NODE_SEMVER=""
    NODE_MAJOR=""
    NODE_FULL=""

    if ! run_node -e "process.exit(0)" &>/dev/null; then
        return 1
    fi

    NODE_CMD=$(resolve_node_cmd)
    NODE_SEMVER=$(get_node_semver)
    if [ -n "$NODE_SEMVER" ]; then
        NODE_MAJOR=$(echo "$NODE_SEMVER" | cut -d. -f1)
        NODE_FULL="v$NODE_SEMVER"
    fi

    # Keep npm / global wrappers in the same directory as node (avoid leftover Roaming shims stealing PATH)
    if [ -n "$NODE_CMD" ] && [ -f "$NODE_CMD" ]; then
        NODE_DIR=$(dirname "$NODE_CMD")
        export PATH="$NODE_DIR:$PATH"
    fi
    return 0
}

run_npm() {
    local npm_cmd=""
    if command -v where.exe &>/dev/null; then
        npm_cmd=$(first_existing_where npm.cmd)
    fi
    if [ -z "$npm_cmd" ] || [ ! -f "$npm_cmd" ]; then
        npm_cmd="npm"
    fi
    "$npm_cmd" "$@"
}

# Clean a broken CodeGraph under %APPDATA%\npm (package present but cli.js missing)
cleanup_roaming_codegraph() {
    local roaming="${APPDATA:-$HOME/AppData/Roaming}/npm"
    roaming=$(printf "%s" "$roaming" | normalize_path)
    local pkg="$roaming/node_modules/@optave/codegraph"
    local cli="$pkg/dist/cli.js"
    if [ -d "$pkg" ] && [ ! -f "$cli" ]; then
        echo "🧹 Cleaning broken Roaming CodeGraph: $pkg"
        rm -f "$roaming"/codegraph "$roaming"/codegraph.cmd "$roaming"/codegraph.ps1 2>/dev/null
        rm -rf "$pkg" 2>/dev/null
    fi
}

resolve_codegraph_cmd() {
    local npm_prefix p

    p=$(first_existing_where codegraph.cmd)
    if [ -n "$p" ]; then
        echo "$p"
        return 0
    fi
    p=$(first_existing_where codegraph)
    if [ -n "$p" ]; then
        echo "$p"
        return 0
    fi

    p=$(which codegraph 2>/dev/null | head -1 | normalize_path)
    if [ -n "$p" ] && [ -f "$p" ]; then
        echo "$p"
        return 0
    fi

    npm_prefix=$(run_npm prefix -g 2>/dev/null | normalize_path)
    if [ -n "$npm_prefix" ]; then
        if [ -f "$npm_prefix/codegraph.cmd" ]; then
            echo "$npm_prefix/codegraph.cmd"
            return 0
        fi
        if [ -f "$npm_prefix/codegraph" ]; then
            echo "$npm_prefix/codegraph"
            return 0
        fi
    fi
    return 1
}

run_codegraph() {
    local p
    p=$(first_existing_where codegraph.cmd)
    if [ -z "$p" ]; then
        p=$(first_existing_where codegraph)
    fi
    if [ -n "$p" ]; then
        "$p" "$@"
        return $?
    fi

    p=$(resolve_codegraph_cmd 2>/dev/null) || true
    if [ -n "$p" ] && [ -f "$p" ]; then
        "$p" "$@"
        return $?
    fi

    if type codegraph &>/dev/null; then
        codegraph "$@"
        return $?
    fi
    return 127
}

# Whether the package is installed (npm record OR cli.js exists)
codegraph_pkg_exists() {
    local npm_prefix cli
    # npm ls -g check (tolerate CRLF under Git Bash)
    if run_npm ls -g @optave/codegraph --depth=0 2>/dev/null | grep -q "@optave/codegraph"; then
        return 0
    fi
    # File-level check
    npm_prefix=$(run_npm prefix -g 2>/dev/null | normalize_path)
    if [ -n "$npm_prefix" ]; then
        cli="$npm_prefix/node_modules/@optave/codegraph/dist/cli.js"
        [ -f "$cli" ] && return 0
    fi
    return 1
}

# Whether the CLI works (call cli.js with node to bypass .cmd native-binding wrapper issues)
codegraph_cli_works() {
    local npm_prefix cli
    npm_prefix=$(run_npm prefix -g 2>/dev/null | normalize_path)
    [ -n "$npm_prefix" ] || return 1
    cli="$npm_prefix/node_modules/@optave/codegraph/dist/cli.js"
    [ -f "$cli" ] || return 1
    run_node "$cli" --version &>/dev/null
}

# Real availability is decided by build; --version succeeding does not mean native binding works
codegraph_build_project() {
    local project_dir="${1:-.}"
    [ -d "$project_dir" ] || return 1
    (
        cd "$project_dir" || exit 1
        run_codegraph build
    )
}

codegraph_build_works() {
    local project_dir="${1:-.}"
    [ -d "$project_dir" ] || return 1
    (
        cd "$project_dir" || exit 1
        run_codegraph --version &>/dev/null || exit 1
        run_codegraph build &>/dev/null
    )
}

# Installed and CLI works
codegraph_installed() {
    codegraph_pkg_exists && codegraph_cli_works
}

# Installed but CLI does not work (leftover / broken)
codegraph_broken_install() {
    codegraph_pkg_exists && ! codegraph_cli_works
}
