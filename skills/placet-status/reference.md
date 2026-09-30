# Status Scan Reference

## Trigger

```
/placet-status
view status, target project: <path>
```

## Mandatory: scan all requirements

**Do not** report only the single requirement the user mentioned. MUST:

1. `Glob` or `ls` to list `{project}/docs/*/` (**exclude** `knowledge-base`)
2. Read the **## Requirement Index** table in `docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md`
3. **Merge** both sources, deduplicate, then output every row (do not miss requirements that exist only in KB or only in docs)
4. Check whether `{project}/tests/{requirement-id}/` exists
5. Check whether `CHANGELOG.md` contains `## Knowledge Base Anchor`

## Recommended: run the scan script

```bash
node "$FRAMEWORK/skills/placet-status/scripts/scan-status.js" "<target-project-absolute-path>"
```

Use the script output as the basis for the status overview, then add CHANGELOG change details.

## Required documents by level

| Level | Required docs | Test code |
|------|----------|--------|
| **S** | 00, 01, 05 (skip 02/03/04 documents) | `tests/{id}/` optional |
| **M** | 00, 01, 02, 03, 04, 05 | `tests/{id}/` optional; 02a interface contract as needed |
| **L** | 00, 01, 02, 03, **03a**, 04, **04a**, 05 | `tests/{id}/` optional; 02a recommended for high-risk / interface changes |

**L-level MUST have both** `03-software-design.md` and `03a-change-strategy.md` (not either-or).

## How to get the level

For each requirement **MUST first read** the first 40 lines of `01-requirements-analysis.md` for S/M/L. **Do not** guess the level from file count alone.

## Status priority

1. CHANGELOG paused → ⏸️
2. CHANGELOG in change → 🔁
3. Cannot read S/M/L → ⚠️ Level unconfirmed
4. Missing required docs for the level → 🔄 In progress
5. Required docs complete + 05-test-report → ✅

## Current-stage inference (highest-numbered document present)

| Latest existing document | Next step |
|-------------|--------|
| 00 only | Continue Task 3 |
| 01 (S-level) | Task 6 coding (S-level skips PRD / design / test cases) |
| 01 (M/L-level) | Task 4 PRD |
| 02 | Task 4.5 interface contract (if needed) or Task 5 design |
| 02a | Task 5 design |
| 03 (+03a at L-level) | Task 6 coding |
| 04 (+04a at L-level) | Task 7 `test cases` |
| 05 | Task 8.5 `update knowledge base` |
