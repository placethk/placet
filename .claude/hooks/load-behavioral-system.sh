#!/bin/bash
# Load Collective Behavioral System
# SessionStart hook - loads only critical behavioral files
# Detailed docs loaded on-demand via @import when /van is called

DEVPILOT_VERSION=$(cat VERSION 2>/dev/null || echo "?.?")
echo "✅ Placet pipeline v${DEVPILOT_VERSION} — ready"

# Critical: Global Decision Engine (auto-delegation, always active per DECISION.md)
cat .claude-collective/DECISION.md

# Critical: Placet pipeline rules (flow triggers, change levels, output paths)
cat .claude-collective/cicd-rules.md

# Other files (.claude-collective/CLAUDE.md, agents.md, hooks.md, quality.md, research.md)
# are loaded on-demand when /van command is invoked, via @import directives in CLAUDE.md