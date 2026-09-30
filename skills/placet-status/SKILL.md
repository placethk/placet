---
name: placet-status
description: Scan the target project's docs/ and tests/ directories, list the status of ALL requirements (S/M/L document completeness, test code, in-change/paused), and output a structured overview plus next-step suggestions. In a new session this can replace init for recovery. Natural language: view status.
---

# Placet Intelligent Pipeline — Status

**Purpose:** Recover work state in one shot after opening a new session; **MUST list the status of every current requirement**, not a single requirement only.

Detailed rules: [reference.md](reference.md).

## Trigger

```
/placet-status
view status, target project: <path>
```

Natural language: `view status`, `project status`, `target project: <path> status`

## Execution

### Step 0: Auto-activation check

1. Read `~/.claude/placet-framework-path` → `$FRAMEWORK`, then read `$FRAMEWORK/VERSION`
2. Load `$FRAMEWORK/CLAUDE.md` and `$FRAMEWORK/.claude-collective/cicd-rules.md`
3. Print `🚀 Placet v{version} activated`
4. Resolve the target project path (already set in the session / prompt to confirm if the current directory is not the framework directory / otherwise ask)
5. After confirmation, remember the path and reuse it for the rest of the session

### Step 1: Scan ALL requirements (mandatory)

**MUST complete every item below; omitting any is forbidden:**

1. **Run the scan script** (preferred):
   ```bash
   node "$FRAMEWORK/skills/placet-status/scripts/scan-status.js" "<target-project-absolute-path>"
   ```
2. **Enumerate docs requirement directories**: `{project}/docs/*/` (**exclude** `knowledge-base` and directories starting with `.`)
3. **Read the knowledge-base Requirement Index**: the `## Requirement Index` table in `docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md`
4. **Merge and deduplicate**: take both docs directories and the KB index as sources, output every row; mark orphans that exist "KB only / docs only"
5. **For each requirement**, check in the order in reference.md:
   - CHANGELOG.md → paused / in change
   - First 40 lines of `01-requirements-analysis.md` → S/M/L (**do not** guess the level from file count)
   - `CHANGELOG.md` → whether it contains `## Knowledge Base Anchor`
   - Judge docs completeness by level
   - Whether `tests/{requirement-id}/` exists
6. **Optional but recommended: run the knowledge-base validator** (recommended for historical / large projects):
   ```bash
   node "$FRAMEWORK/skills/placet-knowledge-base/scripts/validate-kb.js" "<target-project-absolute-path>"
   ```

### Step 2: Output status + next-step suggestions

Use the script output as the skeleton, then add CHANGELOG change details. Format below.

## Document completeness by level

| Level | Required docs | Test code |
|------|----------|--------|
| **All levels** | `00-original-requirements.md` | — |
| **S** | 00 + 01 + 05 | `tests/{id}/` optional; skip 02/03/04 **documents** |
| **M** | 00 + 01 + 02 + 03 + 04 + 05 | `tests/{id}/` optional; `02a` interface contract as needed |
| **L** | 00 + 01 + 02 + 03 + **03a** + 04 + **04a** + 05 | `tests/{id}/` optional; `02a` recommended for high-risk / interface changes |

**L-level MUST have both** `03-software-design.md` and `03a-change-strategy.md` (not either-or).

Missing 02/03/04 **documents** is expected at S-level; missing `05-test-report.md` still counts as in progress.

## Status definitions

| Status | Condition |
|------|----------|
| ⏳ Not started | Directory exists but no 00/01 |
| 🔄 In progress | Required docs for the level are incomplete |
| ⚠️ Level unconfirmed | Requirement docs exist but S/M/L cannot be read from 01/00/KB index |
| ✅ Completed | Required docs for the level are complete + `05-test-report.md` |
| ✅✅ Change completed | Completed + CHANGELOG contains a closed change record |
| ⏸️ Paused | CHANGELOG or 01 explicitly marks paused |
| 🔁 In change | CHANGELOG has an unclosed change record |

## Current-stage inference

| Latest existing document | Next step |
|-------------|--------|
| 00 only | Task 3 `requirements analysis` |
| 01 (S-level) | Task 6 `implement code` (S-level skips PRD / design / test cases) |
| 01 (M/L-level) | Task 4 `generate PRD` |
| 02 | Task 4.5 `confirm PRD, generate interface contract` (if needed) or Task 5 `software design` |
| 02a | Task 5 `software design` |
| 03 (L-level also needs 03a) | Task 6 `implement code` |
| 04 (L-level also needs 04a) | Task 7 `test cases` |
| 05 | Task 8.5 `update knowledge base` |

## Outputs

MUST include **every** requirement:

```
📊 Project Status Overview

Target project: D:\projects\my-app
Knowledge base: ✅ BASE + DETAIL (Requirement Index N rows)
CodeGraph: ✅ .codegraph exists / ⚠️ large project — recommend running codegraph build first

| ID | Level | Status | Current stage | Missing | Test code |
|------|:--:|:--:|---------|------|--------|
| user-login | S | ✅ | Completed | — | ✅ yes |
| hw-swl-core | M | 🔄 | Task 7 test cases | 05-test-report | ✅ yes |
| log-print-cleanup | M | 🔄 | Task 6 coding | 04, 05 | — |
| ... (one row per requirement; do not omit) ... |

⚠️ Orphans:
  - In KB but not in docs: ...
  - In docs but not registered in KB: ... → suggest Task 8.5 to update the index

Next steps:
  - log-print-cleanup [M]: after confirming code, `test cases`
  - ...
```

## Skill command list

```
/placet-init                    → activate the pipeline
/placet-knowledge-base         → generate knowledge base (Task 2)
/placet-knowledge-fact-gate    → knowledge-base fact gate (verify before inject)
/placet-status          → view status (this Skill)
/placet-knowledge-base-update  → incremental knowledge-base update (Task 8.5)
/placet-env-setup                 → environment setup
/placet-ui-ux                  → UI/UX design
```

Natural language triggers: `view status`, `project status`, `target project: <path> status`

## Remember

- Write outputs into the **target project**; do not write into the framework directory
- Each requirement's documents live in `docs/{requirement-id}/`; test code lives in `tests/{requirement-id}/`
- There is one shared knowledge-base; Task 8.5 updates it incrementally
- **This Skill's core job is "one table for all requirements"** — when the user says status they expect the full list, not a summary of one requirement
- After each stage, wait for user confirmation; do not auto-advance to the next stage
