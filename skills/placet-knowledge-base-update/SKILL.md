---
name: placet-knowledge-base-update
description: Placet Task 8.5 — incremental knowledge-base update. Update the DETAIL Requirement Index, function inventory, and related modules without a full rescan. Trigger in Claude Code via /placet-knowledge-base-update. Natural language: update knowledge base.
---

# placet-knowledge-base-update — Incremental Knowledge-Base Update

> **Runtime: Claude Code**. Run after a requirement is completed or changed. Do not full-rescan.

## Trigger

```
/placet-knowledge-base-update --project <target-project-path> [--req-id <requirement-id>]
```

Or natural language: `update knowledge base` / `knowledge base update`

## Prerequisites

1. Read `~/.claude/placet-framework-path` → `$FRAMEWORK`
2. Read `$FRAMEWORK/docs/KNOWLEDGE_BASE_RULES.md` §6.1
3. Read `$FRAMEWORK/skills/placet-knowledge-base/reference.md` §7–9

## Inputs

| Source | Purpose |
|------|------|
| Full document set under `docs/{requirement-id}/` | Scope of this change |
| Source files modified this time | Incremental module/function updates |
| `docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md` | Update target |
| `docs/knowledge-base/*.puml` | Prefer updating these when a flow changes |

## Execution (fixed order)

### 1. Decide the update scope

- Architecture / deployment change → also update BASE
- Feature / module / function change → update DETAIL
- Flow change → update PUML **first**, then DETAIL

### 2. Update DETAIL (MUST after every completed requirement)

- **Requirement Index**: append or update one row (id, display name, level, related modules, version)
- **Function inventory table**: append/update rows for functions touched by this change
- **API inventory** (if HTTP changed): append endpoint rows
- **Update records**: version +1, append a change note

### 3. Update the CHANGELOG.md anchor

Write into the `## Knowledge Base Anchor` section of `docs/{requirement-id}/CHANGELOG.md` (**the only write location**; do not repeat this in 00/01/02/03 or other development docs):

```markdown
## Knowledge Base Anchor
- Knowledge-base version: vX.Y
- Related module domains: ...
- See: docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md
```

### 4. Self-check list

- [ ] DETAIL Requirement Index updated
- [ ] Function inventory table synced
- [ ] PUML change record appended (if applicable)
- [ ] BASE / DETAIL / PUML version numbers match

### 5. Run knowledge-base validation

```bash
node "$FRAMEWORK/skills/placet-knowledge-base/scripts/validate-kb.js" "<target-project-path>"
```

If validation reports Error, MUST fix before Task 8.5 counts as done; Warning MUST be explained in the output with a follow-up suggestion.

### 6. Refresh the fact gate

```bash
node "$FRAMEWORK/skills/placet-knowledge-fact-gate/scripts/verify-kb-facts.js" "<target-project-path>" --query "<this-requirement-id-or-change-keywords>"
```

Report pass/fail to the user. fail means the knowledge base just written still has falsifiable fields that disagree with source — correct DETAIL and rerun, or mark those entries as not-to-be-used-as-fact in the output.

## Outputs

Tell the user the updated file paths, version number, `validate-kb.js` result, and fact-gate pass/fail. **Do not** full-rescan the entire project (unless the user explicitly asks to rebuild the knowledge base).

## Difference from Task 2

| Task | Skill | Scope |
|------|-------|------|
| 2 full | `/placet-knowledge-base` | First onboarding, whole-project scan |
| 8.5 incremental | `/placet-knowledge-base-update` | Only chapters involved in this requirement |
