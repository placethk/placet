---
name: placet-knowledge-fact-gate
description: Placet knowledge-base fact gate. Use a code oracle to verify falsifiable knowledge-base claims; only pass claims may be injected into context. Natural language: verify knowledge / fact gate / admitted knowledge.
---

# placet-knowledge-fact-gate — Knowledge-Base Fact Gate

> The knowledge base remains searchable. What enters model context MUST be **claims the code can prove**. Humans are not the referee.

## Trigger

```
/placet-knowledge-fact-gate --project <target-project-path> [--query "<current-task-keywords>"]
```

Natural language: `verify knowledge` / `fact gate` / `admitted knowledge` / `is the knowledge base true`

Inside the pipeline the user does **not** need to trigger this manually: before tasks 3/4/5/6/9 treat the knowledge base as fact, the AI MUST run this script first (after step ③ creates 00; do not run before the requirement id is confirmed, because the oracle reads source code).

## What it does

1. Extract falsifiable claims from `docs/knowledge-base/`: paths, symbols, module directories, HTTP routes, environment variables
2. Deterministically verify them against current source (no model)
3. Inject only `pass` into admissible context; treat `fail` as disproven and do not cite it as fact
4. Does not block reading source and does not shrink RAG search scope; false entries simply cannot enter "treat as true" context

Narrative that cannot be extracted as path/symbol/module/route/env var is **not proof** — use it only as a clue, and MUST re-check source before citing.

## Execution (MUST run via tools; do not ask the user to copy commands)

```bash
node "$FRAMEWORK/skills/placet-knowledge-fact-gate/scripts/verify-kb-facts.js" "<target-project-absolute-path>" --query "<current-requirement-or-task-keywords>"
```

On Windows PowerShell, also invoke `node`, using absolute paths.

`$FRAMEWORK` comes from `~/.claude/placet-framework-path`.

With no `--query`, verify the whole library and refresh the admitted-facts file; with `--query`, also write the injectable slice for this query.

## Outputs (write to the target project; do not write to the framework directory)

| File | Purpose |
|------|------|
| `docs/knowledge-base/PROJECT_KNOWLEDGE_ADMITTED.md` | The only admitted-facts list when an agent cites knowledge-base facts |
| `docs/knowledge-base/.verified/claims.json` | All claims with pass/fail |
| `docs/knowledge-base/.verified/report.md` | Human-readable report |
| `docs/knowledge-base/.verified/query-admit.md` | Injectable slice for this query |

## Pipeline hard rules

1. Before tasks 3/4/5/6/9 write the knowledge base as **current fact** into analysis, MUST run this script first (with the current task `--query`)
2. Only claims with `status=pass` may be treated as "the project is like this now"
3. Entries with `status=fail`: the knowledge base is stale. Do not put them into requirements/design/implementation rationale; Read/Grep source when needed
4. Raw `PROJECT_KNOWLEDGE_BASE.md` / `DETAIL.md` remain searchable and readable as structure; **do not bypass the gate and treat paths/symbols/modules/routes in them as facts**
5. If the knowledge base does not exist: print `KB_STATUS=missing`, skip the gate, and do not force-generate a knowledge base
6. This gate does not restrict reading source; but MUST run only after the requirement id is confirmed and 00 is created (the oracle scans source)

## Handoff with tasks 2 / 8.5

- After Task 2 generates the knowledge base and `validate-kb.js` structure checks pass, MUST run this script again ( `--query` optional)
- After Task 8.5 incremental update, MUST run it again as well
- `validate-kb.js` only checks document structure; this script checks "does it still match the code"

## What to tell the user

- Total claim count, pass/fail
- Stale paths/symbols in fail that relate to the current task (do not dump the whole table)
- Be explicit: later analysis uses only admitted results; stale entries were ignored
