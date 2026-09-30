# Placet customization and extension guide

Placet is an open framework. Anyone can customize a development pipeline on top of it.

---

## Scenario 1: Add product-specific features for XX

Typical need: a project has its own coding standards, stack constraints, and fixed templates, and you want the pipeline to enforce them.

### Files to change (simple → deep)

| Change | File | Effect |
|--------|------|------|
| Add trigger keywords | `CLAUDE.md` (trigger table) | Map new natural-language keywords → Skill |
| Add a new Skill | `skills/your-skill-name/SKILL.md` | Add a pipeline command (auto-registered after install) |
| Add process rules | `.claude-collective/cicd-rules.md` | Rules injected at SessionStart (every session) |
| Add a dedicated Agent | `.claude/agents/your-agent-name.md` | Define the Agent's role and capabilities |
| Add Hook behavior | `.claude/hooks/` + `.claude/settings.json` | Inject custom behavior around tool calls |
| Change pipeline behavior | `PLACET.md` (AI rulebook) | Adjust stages, output requirements, quality bar |

### Minimal example: add a "generate API docs" Skill

```bash
# 1. Create the Skill directory and file
mkdir -p skills/api-doc-generator
cat > skills/api-doc-generator/SKILL.md << 'EOF'
---
name: api-doc-generator
description: Scan the target project and generate API interface docs
---

# API documentation generator

## Steps
1. Scan the target project's route files
2. Extract interface definitions (path, method, parameters, return values)
3. Generate Markdown API docs
4. Write to `{target-project}/docs/api-doc.md`

## Input format
  generate API docs, target project: D:\my-project
EOF

# 2. Add a row to the CLAUDE.md trigger table
# | `generate API docs`, `API docs` | api-doc-generator | ...
```

---

## Scenario 2: Improve this repo

### Suggested path (easier → harder)

| Level | What to do | Involves |
|------|--------|------|
| **Level 1: Use it** | Walk a real project through the full flow and note friction | No code changes |
| **Level 2: Fix docs** | Correct inaccurate text in README.md / PLACET.md / CLAUDE.md / QUICKSTART | Edit `.md` files |
| **Level 3: Fix Skills** | Improve a Skill's prompt so the AI behaves better | `skills/*/SKILL.md` |
| **Level 4: Fix rules** | Adjust trigger rules and S/M/L grading logic | `CLAUDE.md`, `cicd-rules.md` |
| **Level 5: Fix Hooks** | Change SessionStart injection or add hooks | `.claude/hooks/*.sh` + `settings.json` |
| **Level 6: Fix Agents** | Improve Agent definitions and role prompts | `.claude/agents/*.md` |
| **Level 7: Fix the installer** | Improve `install.sh` dependency detection and cross-platform support | `install.sh` |

### Quick file map

```
Want to change process rules     → PLACET.md (full AI rulebook)
Want to change the product intro → README.md (GitHub / human entry)
Want to change trigger keywords  → CLAUDE.md (trigger table)
Want to change session rules     → .claude-collective/cicd-rules.md
Want to change Skill behavior    → skills/<skill-name>/SKILL.md
Want to change Agent behavior    → .claude/agents/<agent-name>.md
Want to change Hook behavior     → .claude/hooks/<hook-name>.sh
Want to change install           → install.sh
Want to change knowledge-base rules → docs/KNOWLEDGE_BASE_RULES.md
Want to change GitHub display    → docs/github-repo-settings.md (About / Topics / default branch)
```
