#!/bin/bash
# Placet Skill update script
# Action: backup current placet-* + leftover Placet jit-* names → delete those → reinstall from this repo
# Does not touch unrelated Skills (including original DevPilot jit-devpilot-* installs).
# Usage: bash update-skills.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/skills"
SKILLS_DST="$HOME/.claude/skills"
BACKUP_DIR="$HOME/.claude/skills_backup_$(date +%Y%m%d_%H%M%S)"

# Old directory names this product used to install (safe to remove).
# Do not add jit-devpilot-* — those belong to the original Chinese DevPilot repo.
LEGACY_NAMES=(
  jit-placet-init
  jit-project-placet-status
  jit-project-knowledge-base
  jit-project-knowledge-base-update
  jit-project-knowledge-fact-gate
  jit-context-compress
  jit-skill-eval
  jit-env-auto-setup
  jit-ui-ux-pro-max
  jit-nowTimeAndModel
)

echo "========================================="
echo "  Placet Skill update script"
echo "========================================="
echo ""

OLD_SKILLS=()
shopt -s nullglob
for skill_dir in "$SKILLS_DST"/placet-*/; do
  OLD_SKILLS+=("$skill_dir")
done
shopt -u nullglob
for skill_name in "${LEGACY_NAMES[@]}"; do
  if [ -d "$SKILLS_DST/$skill_name" ]; then
    OLD_SKILLS+=("$SKILLS_DST/$skill_name/")
  fi
done

echo "--- Step 1: backup managed Placet Skills ---"

if [ ${#OLD_SKILLS[@]} -gt 0 ]; then
    mkdir -p "$BACKUP_DIR"
    for skill_dir in "${OLD_SKILLS[@]}"; do
        skill_name=$(basename "$skill_dir")
        cp -r "$skill_dir" "$BACKUP_DIR/"
        echo "  📦 Backup: $skill_name"
    done
    echo "  Backup directory: $BACKUP_DIR"
else
    echo "  No managed Placet Skills to back up"
fi

echo ""
echo "--- Step 2: delete managed Placet Skills ---"

if [ ${#OLD_SKILLS[@]} -gt 0 ]; then
    for skill_dir in "${OLD_SKILLS[@]}"; do
        skill_name=$(basename "$skill_dir")
        rm -rf "$skill_dir"
        echo "  🗑️  Delete: $skill_name"
    done
    echo "  Deleted ${#OLD_SKILLS[@]} old Skills"
else
    echo "  No managed Placet Skills to delete"
    mkdir -p "$SKILLS_DST"
fi

echo ""
echo "--- Step 3: install Skills from this repo ---"

mkdir -p "$SKILLS_DST"

INSTALLED=0
shopt -s nullglob
for skill_dir in "$SKILLS_SRC"/placet-*/; do
    skill_name=$(basename "$skill_dir")
    if [ -f "$skill_dir/SKILL.md" ]; then
        rm -rf "$SKILLS_DST/$skill_name"
        cp -r "$skill_dir" "$SKILLS_DST/"
        echo "  ✅ Install: $skill_name"
        INSTALLED=$((INSTALLED + 1))
    fi
done
shopt -u nullglob

echo "$SCRIPT_DIR" > "$HOME/.claude/placet-framework-path"
echo "✅ Framework path updated: $SCRIPT_DIR"

echo ""
echo "========================================="
echo "  ✅ Update complete: installed $INSTALLED Skills"
echo "========================================="
echo ""

echo "Installed Skills:"
for skill_dir in "$SKILLS_SRC"/placet-*/; do
    skill_name=$(basename "$skill_dir")
    [ -f "$skill_dir/SKILL.md" ] && echo "  - $skill_name"
done

echo ""
echo "If Claude Code is already running, restart the session so new Skills take effect (/exit → claude)"
