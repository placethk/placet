#!/bin/bash
export TERM=ansi
# Placet pipeline — one-shot install script
# Compatible with: Windows Git Bash / macOS / Linux
#
# Prerequisites:
#   - Node.js >= 18 (auto-detected if already installed)
#   - git (auto-detected if already installed)
#   - Claude Code CLI (npm install -g @anthropic-ai/claude-code)
#
# Usage:
#   bash install.sh           # install Skills (default)
#   bash install.sh --tools   # install Skills + Node.js tool pack (docx/xlsx/pdf-parse, etc.)
#   bash install.sh --tools-only  # install tool pack only, skip Skills

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"
TOOLS_DIR="$HOME/.claude/tools/node-libs"

# Cross-platform Node detection library
# shellcheck source=scripts/node-detect.sh
source "$SCRIPT_DIR/scripts/node-detect.sh"

# Base tool-pack list
TOOL_PACKAGES="docx mammoth xlsx pdf-parse markdown-docx officeparser"

# Wait for a keypress before exit so the window does not flash closed
pause_exit() {
    echo ""
    echo "Press Enter to exit..."
    read -r
    exit "${1:-1}"
}

# Parse arguments
INSTALL_TOOLS=false
INSTALL_SKILLS=true

for arg in "$@"; do
    case $arg in
        --tools)
            INSTALL_TOOLS=true
            ;;
        --tools-only)
            INSTALL_TOOLS=true
            INSTALL_SKILLS=false
            ;;
    esac
done

echo "========================================="
echo "  Placet pipeline — install wizard"
echo "========================================="
echo ""

# --- Preflight ---

# 1. Node.js >= 18 (Windows Git Bash compatible detection)
if ! node_detect_init; then
    echo "❌ Node.js not found. Please install Node.js >= 18 first"
    echo "   Download: https://nodejs.org/"
    echo "   Recommended: 20.x LTS or 22.x LTS"
    echo ""
    echo "   Windows hint: if Node is installed but not detected, confirm node is on PATH"
    echo "   PowerShell check: where.exe node && node -v"
    pause_exit 1
fi

echo "   Detected path: $NODE_CMD"

if [ -z "$NODE_SEMVER" ]; then
    echo "⚠️  Warning: could not parse Node.js version (node -p process.versions.node failed)"
    run_node -v 2>&1 || true
    echo ""
    echo "   Press Enter to continue (assuming the version is OK), or Ctrl+C to cancel..."
    read -r
elif ! version_ge "$NODE_SEMVER" "18.0.0"; then
    echo "❌ Node.js version too low: $NODE_FULL, need >= 18"
    echo "   Recommended upgrade: 20.x LTS or 22.x LTS"
    pause_exit 1
else
    echo "✅ Node.js: $NODE_FULL"
fi

# 2. git
if ! command -v git &> /dev/null; then
    echo "❌ git not found. Please install git first"
    pause_exit 1
fi
echo "✅ git: $(git --version)"

# 3. Python 3 (needed by placet-ui-ux skill, not a hard dependency)
PYTHON3_AVAILABLE=false
PYTHON3_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON3_CMD="python3"
    PYTHON3_AVAILABLE=true
elif command -v py &> /dev/null; then
    py_ver=$(py -3 --version 2>&1 | grep -oE 'Python 3\.' | head -1)
    if [ -n "$py_ver" ]; then
        PYTHON3_CMD="py -3"
        PYTHON3_AVAILABLE=true
    fi
elif command -v python &> /dev/null; then
    py_ver=$(python --version 2>&1 | grep -oE 'Python 3\.' | head -1)
    if [ -n "$py_ver" ]; then
        PYTHON3_CMD="python"
        PYTHON3_AVAILABLE=true
    fi
fi
if [ "$PYTHON3_AVAILABLE" = true ]; then
    echo "✅ Python 3: $($PYTHON3_CMD --version 2>&1)"
else
    echo "⚠️  Python 3 not found (needed for placet-ui-ux search)"
    echo "   Install: https://www.python.org/downloads/"
    echo "   Or: winget install Python.Python.3.12"
    echo ""
fi

# 4. Claude Code (hard dependency)
# Use type so command -v claude does not trigger TTY detection output
if ! type claude &> /dev/null; then
    echo "❌ Claude Code CLI not found"
    echo ""
    echo "   Claude Code is a prerequisite for this pipeline and must be installed to continue."
    echo ""
    echo "   Install automatically now? (y/n)"
    read -r INSTALL_CLAUDE
    if [ "$INSTALL_CLAUDE" = "y" ] || [ "$INSTALL_CLAUDE" = "Y" ]; then
        echo "Installing Claude Code CLI..."
        run_npm install -g @anthropic-ai/claude-code
        if ! type claude &> /dev/null; then
            echo "❌ Claude Code install failed. Please run manually:"
            echo "   npm install -g @anthropic-ai/claude-code"
            echo "   Then re-run this script"
            pause_exit 1
        fi
        echo "✅ Claude Code installed"
    else
        echo ""
        echo "❌ Claude Code is not installed; cannot continue."
        echo "   Install it manually, then re-run this script:"
        echo "   npm install -g @anthropic-ai/claude-code"
        pause_exit 1
    fi
else
    echo "✅ Claude Code: installed"
fi

# --- Install Skills ---
if [ "$INSTALL_SKILLS" = true ]; then
    echo ""
    echo "--- Installing Skills to ~/.claude/skills/ ---"
    mkdir -p "$SKILLS_DIR"

    SKILL_COUNT=0
    shopt -s nullglob
    for skill_dir in "$SCRIPT_DIR"/skills/placet-*/; do
        skill_name=$(basename "$skill_dir")
        if [ -f "$skill_dir/SKILL.md" ]; then
            if [ -d "$SKILLS_DIR/$skill_name" ]; then
                echo "🔄 Update: $skill_name"
            else
                echo "✅ Install: $skill_name"
            fi
            cp -r "$skill_dir" "$SKILLS_DIR/"
            SKILL_COUNT=$((SKILL_COUNT + 1))
        fi
    done
    shopt -u nullglob

    if [ "$SKILL_COUNT" -eq 0 ]; then
        echo "⚠️  No Skills found. Confirm the skills/ directory layout is correct"
        pause_exit 1
    fi
    echo "Installed $SKILL_COUNT Skills (pipeline init / knowledge base / KB update / fact gate / status / env / UI / time-model)"

    # Record framework path for the placet-init skill
    echo "$SCRIPT_DIR" > "$HOME/.claude/placet-framework-path"
    echo "✅ Framework path recorded: $SCRIPT_DIR"
fi

# --- Detect missing tool packages (incremental update) ---
# Even if node_modules already exists, check whether new packages need to be added
if [ "$INSTALL_TOOLS" = false ] && [ -d "$TOOLS_DIR/node_modules" ]; then
    MISSING_PKGS=""
    for pkg in $TOOL_PACKAGES; do
        if [ ! -d "$TOOLS_DIR/node_modules/$pkg" ]; then
            if [ -z "$MISSING_PKGS" ]; then
                MISSING_PKGS="$pkg"
            else
                MISSING_PKGS="$MISSING_PKGS $pkg"
            fi
        fi
    done
    if [ -n "$MISSING_PKGS" ]; then
        echo ""
        echo "--- New tool packages detected ---"
        echo "Installed tool pack needs an update; these packages are not installed yet:"
        for pkg in $MISSING_PKGS; do
            echo "  - $pkg"
        done
        echo ""
        echo "Install them now? (y/n)"
        read -r INSTALL_CHOICE
        if [ "$INSTALL_CHOICE" = "y" ] || [ "$INSTALL_CHOICE" = "Y" ]; then
            INSTALL_TOOLS=true
        fi
    fi
fi

# --- Prompt for tool pack (if --tools was not set and nothing is installed) ---
if [ "$INSTALL_TOOLS" = false ] && [ ! -d "$TOOLS_DIR/node_modules" ]; then
    echo ""
    echo "--- Node.js tool pack ---"
    echo "No Node.js tool pack detected (docx, xlsx, pdf-parse, officeparser, etc.)"
    echo "These packages are used for:"
    echo "  - docx/markdown-docx: generate Word documents"
    echo "  - xlsx: generate Excel documents"
    echo "  - pdf-parse: parse PDF files"
    echo "  - mammoth: Word document conversion"
    echo "  - officeparser: Office document parsing (pptx/docx/xlsx to text)"
    echo ""
    echo "Install now? (y/n)"
    read -r INSTALL_CHOICE
    if [ "$INSTALL_CHOICE" = "y" ] || [ "$INSTALL_CHOICE" = "Y" ]; then
        INSTALL_TOOLS=true
    fi
fi

# --- Install Node.js tool pack ---
if [ "$INSTALL_TOOLS" = true ]; then
    echo ""
    echo "--- Installing Node.js tool pack to $TOOLS_DIR ---"
    mkdir -p "$TOOLS_DIR"

    # Initialize package.json if missing
    if [ ! -f "$TOOLS_DIR/package.json" ]; then
        echo '{"name": "claude-code-tools", "version": "1.0.0", "private": true}' > "$TOOLS_DIR/package.json"
    fi

    # Install packages
    echo "Installing: $TOOL_PACKAGES"
    cd "$TOOLS_DIR"
    run_npm install --save $TOOL_PACKAGES 2>&1 | tail -5
    cd "$SCRIPT_DIR"

    # Verify install
    if [ -d "$TOOLS_DIR/node_modules" ]; then
        echo "✅ Tool pack installed: $TOOLS_DIR/node_modules"
        echo ""
        echo "Verifying installed packages:"
        for pkg in $TOOL_PACKAGES; do
            if [ -d "$TOOLS_DIR/node_modules/$pkg" ]; then
                VERSION=$(run_node -e "console.log(require('$TOOLS_DIR/node_modules/$pkg/package.json').version)" 2>/dev/null || echo "?")
                echo "  ✅ $pkg@$VERSION"
            else
                echo "  ❌ $pkg did not install"
            fi
        done
    else
        echo "⚠️  Tool pack install failed. Retry later with bash install.sh --tools-only"
    fi
fi

# --- CodeGraph detection (optional; do not auto-install) ---
# CodeGraph is an optional accelerator; install.sh does not install it for the user
# Reason: native compile of better-sqlite3 often fails on Windows; auto-install leaves a broken install
# To install, see docs/CodeGraph-install-guide.md
CODEGRAPH_MIN="22.12.0"
echo ""
echo "--- Optional tool: CodeGraph (code-graph analysis) ---"
if codegraph_installed; then
    CG_PREFIX=$(run_npm prefix -g 2>/dev/null | strip_crlf)
    CG_CLI="$CG_PREFIX/node_modules/@optave/codegraph/dist/cli.js"
    CG_VER=$(run_node "$CG_CLI" --version 2>/dev/null | strip_crlf)
    echo "✅ CodeGraph CLI available: ${CG_VER:-unknown version}"
    if codegraph_build_works "$SCRIPT_DIR"; then
        echo "   codegraph build probe passed; knowledge-base generation will preflight first and ask before build on large projects"
    else
        echo "⚠️  CodeGraph CLI is available but build failed (common on Windows with better-sqlite3)"
        echo "   Knowledge base will fall back to index-first scan; repair: docs/CodeGraph-install-guide.md"
    fi
elif codegraph_broken_install; then
    echo "⚠️  CodeGraph is installed but CLI is unavailable (native binding failed or install is broken)"
    echo "   To repair, see docs/CodeGraph-install-guide.md"
    echo "   Placet flow is unaffected; the knowledge-base skill will skip codegraph and use a full scan"
else
    echo "ℹ️  CodeGraph is not installed (optional accelerator; skipping it does not affect the pipeline)"
    echo "   Benefits: 70-80% faster knowledge-base generation, precise change-impact analysis, dead-code detection"
    echo "   To install: npm install -g @optave/codegraph (requires Node >= $CODEGRAPH_MIN)"
    echo "   Common Windows install issues: docs/CodeGraph-install-guide.md"
fi

# --- Done ---
echo ""
echo "========================================="
echo "  ✅ Install complete!"
echo "========================================="
echo ""
echo "How to use:"
echo ""
echo "  Option 1 (recommended): start Claude Code in any directory, then run /placet-init"
echo ""
echo "  Option 2: start Claude Code in the framework directory (auto-activates)"
echo "    cd $SCRIPT_DIR"
echo "    claude"
echo ""
echo "After launch, seeing \"✅ Placet pipeline v$(cat "$SCRIPT_DIR/VERSION") — ready\" means success."
echo ""
echo "Common trigger keywords:"
echo "  requirements analysis: feature description, target project: D:\\my-project"
echo "  /placet-status        → show project status"
echo "  /placet-knowledge-base          → generate project knowledge base"
echo "  /placet-knowledge-fact-gate     → knowledge-base fact gate (verify before inject)"
echo "  /placet-init                   → activate the pipeline"
echo "  /placet-env-setup                  → environment detect and configure"
echo "  ...more commands: QUICKSTART.md"
echo ""
echo "⚠️  If Claude Code is already running, restart the session so new Skills take effect"
echo "     Restart: type /exit in Claude, then run claude again"
echo ""
echo "Extra commands:"
echo "  bash update-skills.sh           # after a framework upgrade, sync placet-* Skills (backup then reinstall)"
echo "  bash install.sh --tools       # add the Node.js tool pack (docx/xlsx, etc.)"
echo "  bash install.sh --tools-only  # install the tool pack only; leave Skills unchanged"
echo "  # Optional CodeGraph install: docs/CodeGraph-install-guide.md (install.sh does not auto-install)"
if [ "$PYTHON3_AVAILABLE" = false ]; then
echo ""
echo "⚠️  Python 3 is not installed; placet-ui-ux search is unavailable"
echo "    Install Python 3: https://www.python.org/downloads/"
echo "    Or: winget install Python.Python.3.12"
fi
echo ""
echo "Press Enter to exit..."
read -r
