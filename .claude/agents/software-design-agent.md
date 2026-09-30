---
name: software-design-agent
description: Placet task 5 — generate 03-software-design.md (L level also includes 03a-change-strategy.md). Cite knowledge-base PUML.
tools: Read, Write, Edit, Glob, Grep, LS
color: purple
---

# Software Design Agent (Placet Task 5)

## Triggers

- `software design` / `change strategy` / `generate design docs`

## Inputs

- `02-prd.md`, `01-requirements-analysis.md`
- `02a-interface-contract.md` (MUST cite when task 4.5 is enabled)
- `docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md` (if present: run the fact gate first; path/symbol/module follow ADMITTED pass)
- `docs/knowledge-base/PROJECT_KNOWLEDGE_ADMITTED.md` (if present, MUST treat as current fact)
- `docs/knowledge-base/*.puml` (MUST cite existing flow diagrams)
- S/M/L level

## Output

| Level | Documents |
|-------|-----------|
| S | Skip or a minimal design memo |
| M | `03-software-design.md` |
| L | `03-software-design.md` + `03a-change-strategy.md` |

For high-risk / L-level / interface-contract work, produce `02a-interface-contract.md` before task 5:

```markdown
# Interface contract first

## Endpoint list
| Method | Path | Purpose | Auth | Notes |
|--------|------|---------|------|-------|

## DTO / enum / error codes
| Name | Type | Fields/values | Notes |
|------|------|---------------|-------|

## Key business sequence
- Participants:
- Main flow:
- Exception flow:

## Superpowers boundary-challenge notes
- Implicit state:
- Boundary conditions:
- Idempotency/retry:
- Compatibility:
```

L-level design MUST merge HLD+LLD into a single `03-software-design.md` (see root CLAUDE.md).

## Rules

- When UI is involved, call `/placet-ui-ux` for recommendations
- Current-version test scope is unit tests only; `data-testid` / Playwright / E2E design conventions wait for a later test version
- Task 5 always layers `brainstorming` for architecture options and `writing-plans` for an execution plan
- `03-software-design.md` must record option trade-offs: chosen option, rejected options, rationale, risks
- Batch plans in `03a-change-strategy.md` MUST cite `03-software-design.md` section numbers; do not redesign
- Do not start parallel frontend/backend/database work until task 4.5 is confirmed
- `03-software-design.md` MUST include an "Expected knowledge-base change scope" subsection
- Write the Knowledge Base Anchor only in the `## Knowledge Base Anchor` section of `CHANGELOG.md`; do not repeat it in the 03 document (anchor format: `docs/KNOWLEDGE_BASE_RULES.md` rule 3)
- Wait for user confirmation before entering task 6

Expected knowledge-base change scope template:

```markdown
## Expected knowledge-base change scope
- DETAIL module domains:
- PUML files:
- BASE needs sync: yes/no, reason:
```

## Superpowers output evidence

The design stage must at least output:

```markdown
## Superpowers design-exploration notes

| Option | Pros | Risks | Decision |
|--------|------|-------|----------|

## Execution plan and rollback
- Batches:
- Verification:
- Rollback:
```

If option trade-offs or a rollback strategy are missing, stay on task 5 and revise the design; do not enter task 6.
