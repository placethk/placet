# Subagent delegation rules (keep the main-session context from exploding)

## Goal

Spell out **which Placet pipeline scenes must be delegated**, **which subagent to use**, and **how to write the delegation prompt**, so the main session does not fill up and stop the task.

## Core principles

1. **The main session does only 3 things**: preflight + user confirmation + receive the subagent report
2. **Subagents run independently**: the main session does not read a subagent's intermediate results
3. **Subagent reports stay under 800 words**: return a summary, not the full document
4. **If a subagent fails (for example quota exceeded)**: resume with SendMessage; do not re-dispatch (preserve context)
5. **Long tasks can run in the background**: `run_in_background=true`, so the main session can keep working

---

## Must-delegate scenes (by Placet stage)

| Stage | Task | Delegate to | Why |
|------|------|--------|---------|
| Task 2 | Knowledge-base generation (full) | `general-purpose` | Scans 1000+ files |
| Task 2 | Knowledge-base generation (with CodeGraph) | `general-purpose` | Reads .codegraph + scans |
| Task 8.5 | Incremental knowledge-base update | `general-purpose` | Reads 13–50 files + existing KB + design docs |
| Task 3 | Requirements analysis (M/L) | `requirements-analysis-agent` | Reads knowledge base + project background |
| Task 4 | PRD generation (M/L) | `prd-generation-agent` | Reads analysis + knowledge base |
| Task 5 | Software design (M/L) | `software-design-agent` | Reads PRD + knowledge base + writes design |
| Task 6 | Code implementation (M/L) | `code-implementation-agent` or `feature-implementation-agent` | Reads design + writes code |
| Task 7 | Test-case generation | `testing-implementation-agent` | Reads design + implemented code |
| Task 8 | Test report | `testing-implementation-agent` | Runs tests + collects results |
| Task 9 | Change-impact analysis | `change-request-agent` | Diffs existing docs |
| Debug | Systematic debugging | `general-purpose` (with systematic-debugging instructions) | Debug traces are long |
| Integration tests | E2E / browser tests | `functional-testing-agent` | Playwright logs are large |
| Bulk scan | Batch-read >20 files | `Explore` or `general-purpose` | Scan results are large |
| Repo-wide search | Grep across many directories | `Explore` | Search hits can be hundreds of lines |

## Must not delegate (main session only)

| Scene | Why |
|------|------|
| Requirement-id suggestion and confirmation | User interaction |
| S/M/L grade evaluation and confirmation | User interaction |
| Preflight self-check | Needs user confirmation for CodeGraph |
| Stage-switch decisions | Flow gate; the main session decides |
| Stage-complete confirmation | User interaction |
| Simple Q&A / consulting | No need to delegate |
| Small single-file edits (S) | Change them directly |

---

## Subagent selection decision tree

```
Is this a Placet pipeline stage?
├─ Yes → use the matching specialist agent (table above)
└─ No →
   Does the task read/scan many files?
   ├─ Yes →
   │  ├─ Search / locate → Explore
   │  └─ Execute / generate → general-purpose
   └─ No →
      Does the task involve browser tests?
      ├─ Yes → functional-testing-agent
      └─ No → main session does it
```

---

## Delegation prompt template

```markdown
You are a Placet pipeline subagent, responsible for [task name].

## Project info
- Target project root: [absolute path]
- Placet framework directory: [absolute path]
- This task: [description]
- Change grade: [S/M/L]

## Input files (already identified; do not search for them)
- [file 1 absolute path] — [purpose]
- [file 2 absolute path] — [purpose]
- [file 3 absolute path] — [purpose]

## Steps
1. [Step 1: concrete action]
2. [Step 2: concrete action]
3. [Step 3: concrete action]

## Return report (strictly under 800 words)

Return this summary. **Do not return full document contents:**

1. **Status**: success / partial / failed
2. **Files read**: about N
3. **Updated/generated files**:
   - [path] — [what changed]
4. **Key changes** (5–10 bullets)
5. **Problems encountered** (if any)
6. **Context-use estimate**: how many files read, how much written (rough word count)

## Constraints
- Do not return full document contents; summary only
- Do not modify unrelated files
- Do not ask the user (subagents cannot interact)
- Record problems and continue; do not abort
- If the task is larger than expected, record that and return; the main session decides
```

---

## Combining with CodeGraph (best practice)

CodeGraph provides **precise location**; the subagent provides **isolated execution**. They complement each other:

```
Main session: codegraph fn-impact <function> → pin N files (+0.5KB)
Main session: delegate a subagent and pass the N file paths
  ↓
Subagent: read those N files + generate a report (blow-up does not hit the main session)
Subagent: return report (+0.5KB)
  ↓
Main session: +1KB total, continue
```

**Example (intl-algorithm incremental knowledge-base update)**:

```
Main session: codegraph fn-impact JITSKF_encrypt_data
  → output: 13 files affected
Main session: delegate a general-purpose subagent
  Prompt must include:
  - Target project path
  - The 13 file paths (from codegraph)
  - Existing knowledge-base path
  - intl-algorithm design-doc path
  - Incremental update rules (Requirement Index + module descriptions + changelog)
Subagent: reads and writes independently
Subagent: returns "✅ DETAIL updated, 13 module descriptions synced, changelog appended"
Main session: receives the report and continues
```

---

## Failure handling

### Common subagent failure causes

| Cause | Symptom | Handling |
|---------|------|------|
| API quota exceeded | 429 | After the quota resets (example: 2026-07-11), resume with SendMessage |
| Subagent context blow-up | Subagent returns an error mid-run | Split the task; dispatch several smaller subagents |
| Wrong file path | Subagent cannot find a file | Main session verifies paths, then delegates |
| Scope larger than expected | Subagent returns "scope exceeded" | Main session decides: split / upgrade / stop |

### Resume with SendMessage (preserve context)

After a subagent fails, do **not** dispatch a new one (that drops prior context). Resume with SendMessage:

```
SendMessage({
  to: "subagent ID",
  message: "Continue the unfinished task, starting from Step X..."
})
```

The subagent keeps all prior tool-call context and continues from the breakpoint.

---

## Examples by Placet stage

### Task 2 knowledge-base generation (1702-file large project)

```
Main session:
  1. Run preflight-kb.ps1 → project scale (+0.5KB)
  2. Ask whether to use CodeGraph
  3. After confirmation, delegate:
     - subagent_type: general-purpose
     - Prompt includes:
       * Run preflight-kb.ps1 -Build (codegraph build)
       * Read SKILL.md for the flow
       * Scan source (use .codegraph to accelerate)
       * Generate PROJECT_KNOWLEDGE_BASE.md + DETAIL.md
       * Return a report (under 800 words)
  4. Receive the report (+0.5KB)
  5. Tell the user: knowledge base generated at path X
```

### Task 8.5 incremental knowledge-base update

```
Main session:
  1. Recall which modules this run changed (already known; no scan)
  2. Delegate:
     - subagent_type: general-purpose
     - Prompt includes:
       * Read existing DETAIL
       * Read this requirement's design docs
       * Incrementally update DETAIL (Requirement Index + module descriptions + changelog)
       * Return a report
  3. Receive the report
  4. Tell the user: DETAIL updated, version vX.Y
```

### Task 6 code implementation (M-grade TDD)

```
Main session:
  1. Confirm the design doc passed review
  2. Delegate:
     - subagent_type: code-implementation-agent
     - Prompt includes:
       * Design-doc path
       * Knowledge-base path (coding-style guidance)
       * Test-code directory (user must confirm)
       * TDD requirements (RED/GREEN/REFACTOR)
       * Return a report (test results + code locations)
  3. Receive the report
  4. Tell the user: code generated, tests passed
```

---

## Self-check (before every delegation)

Before calling Task, the main session checks:

- [ ] Is this a must-delegate scene?
- [ ] Is the subagent type correct?
- [ ] Does the prompt include every needed file path (absolute)?
- [ ] Does the prompt specify the report format (under 800 words)?
- [ ] Does the prompt state constraints (no unrelated edits, no user questions)?
- [ ] Should `codegraph fn-impact` run first for precise location?
- [ ] For a long task, should `run_in_background=true`?

## Self-check (after every delegation)

After receiving the report, the main session checks:

- [ ] Is the report under 800 words?
- [ ] Does it include status, file list, and key changes?
- [ ] Are there unresolved issues for the main session?
- [ ] Should the next step dispatch another subagent?

---

## Suggested Placet framework integration

Placet's CLAUDE.md already says each stage "delegates an Agent", but it **does not require the main session to skip intermediate results**. Suggested addition to CLAUDE.md:

```markdown
## Mandatory subagent delegation rules

When Placet stages delegate Agents, the main session MUST:
1. Not read the subagent's intermediate tool-call results
2. Only receive the final report (keep it under 800 words)
3. Resume with SendMessage on failure; do not re-dispatch

Violating this rule blows up main-session context and stops the task.
```

---

## Test and feedback

After following these rules, watch:

- [ ] Main-session context stays in a safe band (<30% usage)
- [ ] Several long tasks can run in a row without blow-up
- [ ] Subagent reports are accurate (nothing missing)
- [ ] Failures can resume with SendMessage

After feedback, you can adjust:
- The must-delegate scene list
- Subagent-type mapping
- Prompt templates
- Report word-count cap
