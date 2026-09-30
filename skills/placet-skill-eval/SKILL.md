---
name: placet-skill-eval
description: Placet Skill scientific evaluation. Deterministic static checks plus optional LLM smoke tests; writes an HTML report to docs/skill-eval/. Natural language: evaluate skill / skill eval.
---

# placet-skill-eval — Skill Scientific Evaluation

> Give placet-* Skill evolution evidence: run once before a change, once after, and use Rubric score rate to judge better or worse.

## Trigger

```
/placet-skill-eval <skill-name-or-path> [--collect|--quick|--full]
```

Natural language: `evaluate skill` / `skill eval` / `evaluate placet-knowledge-base`

## Three modes (cost low to high; all manually triggered; never auto-run)

| Mode | Command | What it does | Cost |
|------|------|--------|------|
| Static check | `<skill> --collect` | Deterministic static checks only, JSON stdout, **writes no files** | 0 |
| Quick report | `<skill> --quick` | Static minimum (frontmatter + scripts exist + node --check), render HTML | 0 |
| Full evaluation | `<skill> --full` | All static checks + 1 real LLM smoke task, render final HTML | 1 LLM call |

## Execution

### Step 1: Resolve framework path and skill location

Read `~/.claude/placet-framework-path` → `$FRAMEWORK`. Skill name resolves under `$FRAMEWORK/skills/<skill-name>/`; an absolute path is also accepted.

### Step 2: Run by mode

**--collect (zero-cost static check)**
```bash
node "$FRAMEWORK/skills/placet-skill-eval/scripts/eval-skill.js" <skill-name> --collect
```
JSON output: pass/fail for 6 static checks + Rubric score rate + recommended smoke command.

**--quick (zero-cost quick report)**
```bash
node "$FRAMEWORK/skills/placet-skill-eval/scripts/eval-skill.js" <skill-name> --quick
```
Writes a report at `$FRAMEWORK/docs/skill-eval/<skill>-YYYYMMDD.html`.

**--full (static + LLM smoke)**
1. First run `--collect` to see static results and the recommended smoke command
2. Run the script's **recommended smoke command** (one minimal task against a real target project) to verify the skill can run; record `{passed, duration_ms, command, output_head}`
   - Smoke target project: the session's target project if set; otherwise `$FRAMEWORK` itself
   - Smoke principle: only verify "it runs, produces output, exit code 0"; do not go deep into business
3. Merge results and render final HTML:
```bash
node "$FRAMEWORK/skills/placet-skill-eval/scripts/eval-skill.js" <skill-name> --smoke '<JSON>'
```
`<JSON>` looks like: `{"passed":true,"duration_ms":1200,"command":"node ...","output_head":"..."}`

## Static checks (6 items, deterministic, zero LLM)

| # | Check | Notes |
|---|--------|------|
| 1 | Frontmatter completeness | SKILL.md has name + description + trigger wording |
| 2 | Required sections | Contains Trigger / How to / Execution / Outputs |
| 3 | Script references exist | Every scripts/*.js cited in SKILL.md exists |
| 4 | node --check syntax | All scripts/*.js pass syntax check |
| 5 | Trigger words align with CLAUDE.md | description trigger words hit CLAUDE.md |
| 6 | Relative path refs resolve | Relative links inside SKILL.md exist |

## Outputs

| File | Purpose |
|------|------|
| `$FRAMEWORK/docs/skill-eval/<skill>-YYYYMMDD.html` | Human-readable evaluation report (check table + Rubric score rate + smoke results + fix suggestions) |

Reports are written in the **framework repo** (the evaluation target is a framework skill, a framework asset); they do not go into the target project.

## Evaluation-loop suggestions

- **Run `--full` once before and once after changing a Skill**: score rate up = the change improved; down = roll back or fix
- Before shipping a new Skill, MUST run `--quick` at least once (zero cost) to confirm structure compliance
- Periodically (e.g. before each framework release) run `--collect` on all placet-* Skills and summarize, to catch structure drift

## Remember

- **Manual trigger**: this Skill is not hooked, never auto-runs, and is fully on-demand by the user
- `--collect` / `--quick` have zero LLM cost; `--full` spends 1 LLM call
- Smoke only verifies "can run through"; it is not a deep business verification
