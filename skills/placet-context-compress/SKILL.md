---
name: placet-context-compress
description: Placet inter-stage context compression. On stage advance, generate a "chapter skeleton + key points + SHA256" compressed context pack so the AI reads only the pack plus on-demand drill-down instead of re-reading prior documents in full, saving tokens. Natural language: context compress / compress context / handoff compress.
---

# placet-context-compress — Inter-Stage Context Compression

> On stage advance, use `docs/{requirement-id}/.handoff/{target-stage}.context.md` instead of bringing all prior documents into context, saving 25-30% tokens.

## Trigger

```
/placet-context-compress <target-project-path> <requirement-id> <target-stage>
```

Natural language: `context compress` / `compress context` / `generate handoff pack`

Target stage ∈ {`prd`, `design`, `build`, `test`, `report`, `kb`}

## What it does

1. Scan completed documents in `docs/{requirement-id}/` **before** the target stage (00-original-requirements → 05-test-report)
2. For each file, generate a compressed entry: file path, SHA256, line count, list of `##` headings, first-sentence key points per chapter
3. Write `docs/{requirement-id}/.handoff/{target-stage}.context.md`, ending with "on-demand drill-down suggestions" (which file and line to read for details)
4. If an old pack exists and source-document hashes are unchanged → **reuse the old pack**, do not regenerate

## Execution (MUST run via tools)

```bash
node "$FRAMEWORK/skills/placet-context-compress/scripts/compress-handoff.js" "<target-project-absolute-path>" "<requirement-id>" "<target-stage>"
```

On Windows PowerShell, also invoke `node`, using absolute paths. `$FRAMEWORK` comes from `~/.claude/placet-framework-path`.

## Pipeline hard rules (MUST run on stage advance)

1. **Before entering a new stage**: run this script to generate that stage's `.context.md` (pass the target stage name)
2. **Read the pack only**: restore prior context by reading only `.handoff/{stage}.context.md`; **do not re-read prior documents in full**
3. **On-demand drill-down**: when details are needed, follow the pack's "on-demand drill-down suggestions" to the corresponding chapter/line of the original document
4. **After a document is edited**: rerun the script; a hash change auto-regenerates the pack
5. Write output under the **target project** `docs/{requirement-id}/.handoff/`; do not write to the framework directory

## Compressed-pack format example

```markdown
# Stage handoff context pack (user-login → build)
> Generated at: 2026-08-19 14:30 · fingerprint: a1b2c3d4…
> Usage rule: restore context from this pack only; drill down on demand; do not re-read in full.

## Prior document list
- **Requirements analysis** — `01-requirements-analysis.md` (sha256: 3f9a…) · 132 lines
  - Chapters: Project background / Goals / Functional requirements (12 items) / Non-functional requirements / Open questions
  - "Functional requirements" key points: user login MUST support username-password login; support SMS verification-code login…
- **PRD** — `02-prd.md` (sha256: c0de…) · 90 lines
  - …

## On-demand drill-down suggestions
- Need "Functional requirements" details → read around line 24 of `01-requirements-analysis.md`
```

## Common stage mapping

| Target stage | Prior documents included |
|---------|-------------|
| prd | 00, 01 |
| design | 00, 01, 02(+02a) |
| build | 00, 01, 02, 03(+02a/03a) |
| test | 00, 01, 02, 03, 04(+02a/03a/04a) |
| report | 00 ~ 05 all |
| kb | 00 ~ 05 all |

## Remember

- The pack is a **machine-generated mirror**; the documents remain the human-readable source of truth; hashes keep them consistent
- Do not hand-edit `.handoff/*.context.md` (the next run will overwrite or reuse based on hash checks)
- When source hashes are unchanged the script reuses the old pack; rerunning is zero-cost
