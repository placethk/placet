# Usage Guide: `placet-knowledge-base` Skill

> Goal: turn a "historical project" into a structured `PROJECT_KNOWLEDGE_BASE.md` (reusable, searchable, handoff-ready).

---

## 1) What each file in this Skill folder is for

Keep the following files in the same directory (`SKILL.md` is the only strictly required file; the rest are strongly recommended companions):

| File | Required | Purpose | When to read/use |
|---|---|---|---|
| `SKILL.md` | Required | **Runtime main flow**: phases, hard constraints, deliverable structure, quality gates | Read it when you "run the flow"; it decides how the assistant works |
| `reference.md` | Recommended | **Field standards**: field definitions for the module dictionary / util index / tech stack / diagram assets / refactoring suggestions | Read it when you want a shared team vocabulary and stable document fields |
| `examples.md` | Recommended | **Generic structure examples**: what `PROJECT_KNOWLEDGE_BASE.md` should look like (not bound to a business domain) | Use it to align output shape quickly or as a sample for newcomers |
| `HISTORY_PROJECT_ANALYSIS_GUIDE.md` | Recommended | **Historical-project analysis method**: macro understanding, module mapping, asset extraction, quality checkpoints | The AI reads it as method supplement when running the Skill, but `SKILL.md` remains the main flow |
| `USAGE.md` | Recommended | **How to trigger and how to talk**: install location, conversation templates, common missing items | Use it when teaching the Skill as a private SOP to the team |

---

## 2) Where to put it (so the AI assistant can find it)

### For **Cursor**:
Either of the following:

1. **Personal Skill**: `~/.cursor/skills/placet-knowledge-base/` (**recommended; install once, use in all projects**)
   - Windows full path: `C:\Users\YOUR_USERNAME\.cursor\skills\project-knowledge-base\`
   - macOS/Linux full path: `~/.cursor/skills/placet-knowledge-base/`
2. **Project Skill**: `.cursor/skills/placet-knowledge-base/` (current project only)

> As long as that directory contains `SKILL.md`, Cursor can auto-detect and apply the Skill in chat.

### For **Claude Code**:
Claude Code has no built-in Skill directory. Two usages:

1. **Manual read** (simple and direct):
   In chat, tell Claude: `Please first read project-knowledge-base-skill/SKILL.md, then analyze my project following this Skill's flow`

2. **Save to a fixed location** (convenient to reuse):
   Save under your user directory, for example:
   - Windows: `C:\Users\YOUR_USERNAME\.claude\skills\project-knowledge-base\`
   - macOS/Linux: `~/.claude/skills/placet-knowledge-base/`
   When using: `Please read ~/.claude/skills/placet-knowledge-base/SKILL.md, then analyze the current project`

---

## 3) What you need to provide in chat (minimum three items)

To cut back-and-forth, provide these in one shot:

1. **Absolute path of the project root**
2. **Whether full read/search is allowed** (default: allowed)
3. **Output file path** (default: generate `PROJECT_KNOWLEDGE_BASE.md` at the project root; you may specify `docs/PROJECT_KNOWLEDGE_BASE.md`)
4. **Desired depth** (optional, default: `standard full`):
   - `quick skeleton` → overview + module dictionary only; fast
   - `standard full` → overview + modules + utils + flow diagrams + tech stack + suggestions; enough
   - `as exhaustive as possible` → **adds entry analysis + API inventory + config analysis + data-layer analysis**; richer detail

Recommended one-liner:

> Please use the `placet-knowledge-base` Skill. Project root: `E:/my-project`. Output English. Full-repo read allowed. Desired depth: as exhaustive as possible. Output to `docs/knowledge-base/`. **Inside the flow, automatically run preflight for a lightweight self-check, show source-file count, project size, and CodeGraph status; if this is a large project, ask me first whether to use CodeGraph.**

For large projects or first onboarding of a historical project, you may also run `/placet-env-setup` first to confirm whether CodeGraph build is available.

---

## 4) Optional extras (so results match what you care about)

- **What you care about most**: architecture / reuse / APIs / data / security / refactoring
- **Domain background**: one sentence (optional)
- **Primary build file**: if the project has several build files, say which one is primary

---

## 5) Common term / field mapping (avoid inconsistent context)

### 5.1 Module-type mapping

`SKILL.md` often uses descriptive categories; `reference.md` fields may use English enums. Mapping:

| SKILL category | English (reference) |
|---|---|
| Aggregation entry | Aggregation |
| Business module | Business |
| Foundation / shared module | Foundation |
| Build / deploy module | Build |

### 5.2 Util index constraints (hard)

- **MUST list in full** every `*Util*` / `*Helper*` (not a sample)
- **TOP 10 is only a fast entry** (optional) and MUST NOT replace the full index

---

## 6) What the Skill does automatically (you do not need to direct each step)

Following the fixed flow in `SKILL.md`, the assistant will:

- **Automatically run preflight lightweight self-check** (the assistant calls `preflight-kb.sh` / `preflight-kb.ps1`; the user does not run it by hand), show source-file count, project size, whether it is a large project, and CodeGraph status; for large projects it asks whether to use CodeGraph first, and only then runs `codegraph build`
- Scan directories and split modules
- Read the primary build file for tech-stack and version evidence
- Output the module business-dictionary table
- Fully index `*Util*` / `*Helper*` and summarize by category
- Integrate existing flow-diagram assets (if any) and explain them in prose
- Output architecture notes and evidence-backed issues / refactoring suggestions
- Generate the final `PROJECT_KNOWLEDGE_BASE.md`

---

## 7) Missing items you may need to fill (answer in one sentence when asked)

The three most common:

- Absolute path of the project root
- Allowed read scope / permission boundary
- Output location (default: project root)

---

## 8) Acceptance checks (quick review after you get the KB)

- Includes: module business-dictionary table
- Includes: Util/Helper **full index table**
- Includes: category stats (count per category)
- Includes: tech-stack version evidence and architecture notes
- Includes: evidence-backed refactoring suggestions
