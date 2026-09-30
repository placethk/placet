#!/bin/bash
# Placet pipeline — uninstall script
# Removes Skills and the Node.js tool pack installed by this pipeline
#
# Usage:
#   bash uninstall.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"
TOOLS_DIR="$HOME/.claude/tools/node-libs"

# Wait for a keypress before exit so the window does not flash closed
pause_exit() {
    echo ""
    echo "Press Enter to exit..."
    read -r
    exit "${1:-1}"
}

echo "========================================="
echo "  Placet pipeline — uninstall"
echo "========================================="
echo ""

# --- Uninstall Skills (remove all Skills this project installed) ---
echo "The following will be removed:"
echo "  - Placet Skills under ~/.claude/skills/"
echo "  - Tool pack at ~/.claude/tools/node-libs/"
echo ""
echo "Confirm uninstall? (y/n)"
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Uninstall cancelled"
    pause_exit 0
fi

REMOVED=0
for skill_dir in "$SCRIPT_DIR"/skills/*/; do
    skill_name=$(basename "$skill_dir")
    if [ -d "$SKILLS_DIR/$skill_name" ]; then
        rm -rf "$SKILLS_DIR/$skill_name"
        echo "🗑️  Removed skill: $skill_name"
        REMOVED=$((REMOVED + 1))
    fi
done

if [ "$REMOVED" -eq 0 ]; then
    echo "No installed Placet Skills found"
else
    echo "✅ Uninstalled $REMOVED Skills"
fi

# --- Uninstall Node.js tool pack ---
echo ""
if [ -d "$TOOLS_DIR" ]; then
    rm -rf "$TOOLS_DIR"
    echo "🗑️  Removed tool-pack directory: $TOOLS_DIR"
else
    echo "Tool-pack directory not found, skipping"
fi

echo ""
echo "========================================="
echo "  ✅ Uninstall complete"
echo "========================================="
echo ""
echo "Notes:"
echo "  - Only Skills and the tool pack installed by this pipeline were removed"
echo "  - Other Skills under ~/.claude/skills/ were not affected"
echo "  - This repository directory ($SCRIPT_DIR) is not deleted"
echo ""
echo "Press Enter to exit..."
read -r
