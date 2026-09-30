# Placet Flow Core Rules (injected automatically at SessionStart)

> This file is auto-loaded into every session by `.claude/hooks/load-behavioral-system.sh`.
> **Full rules live in `$FRAMEWORK/CLAUDE.md`. This file keeps only hard rules the session MUST know, to avoid duplicate maintenance.**

---

## 1. Flow Gate Rules (FLOW GATE — highest priority, cannot be bypassed)

1. When a Placet keyword matches (requirement / PRD / design / code implementation / test / requirement change) → **MUST enter the Placet pipeline first**; external Skills MUST NOT pre-empt it
2. External skills may only be called **inside** a stage; they MUST NOT replace the pipeline entry
3. The Placet flow **unconditionally wins** over Superpowers or any other external skill match
4. When Superpowers is used inside a stage, MUST record: triggering stage, skill used, input materials, output evidence
5. If Superpowers review / TDD / verification gates fail, MUST stay on the current stage and MUST NOT enter the next stage

> Priority: **root CLAUDE.md > external skills > cicd-rules.md > other rule files**

### 1.1 Superpowers in-stage enhancement mapping

| Placet stage | Superpowers that may be layered | Required evidence |
|--------------|---------------------------------|-------------------|
| Task 3 requirements analysis | brainstorming | Implicit assumptions, non-functional requirements, risk-question list |
| Task 4.5 interface contract first | brainstorming | Endpoints, DTOs, error codes, key sequences |
| Task 5 software design | brainstorming + writing-plans | Trade-offs, batch plan, rollback strategy |
| Task 6 code implementation | test-driven-development | RED/GREEN/REFACTOR and test results |
| Debugging | systematic-debugging | Repro, locate, fix, regression verification |
| End of each batch | requesting-code-review + receiving-code-review | Review conclusions and handling records |
| Before Task 8 | verification-before-completion | Test commands, results, residual risks |

### 1.2 Flow-gate anti-patterns and forbidden behavior (FLOW GATE ANTI-PATTERNS)

**The following is absolutely forbidden before the requirement id is confirmed:**

| Forbidden behavior | Severity | Correct action |
|-------------------|:--------:|----------------|
| Read any source file (.lua/.py/.go/.ts, etc.) before the requirement id is confirmed | 🔴 Critical | Confirm the id, create the 00 file, then read code |
| Read requirement docs under `docs/{requirement-id}/` (00/01/02/03/05, etc.) before the requirement id is confirmed | 🔴 Critical | Confirm the id, then read related docs |
| Read the knowledge base under `docs/knowledge-base/` (BASE/DETAIL/PUML, etc.) | ✅ **Allowed** | The knowledge base may be searched at any time. Before treating it as **current fact**, MUST run `verify-kb-facts.js` and cite only pass. Does not restrict reading source |
| Treat paths/symbols/modules in BASE/DETAIL as facts without verification | 🔴 Critical | Run the fact gate first; cite only pass rows in `PROJECT_KNOWLEDGE_ADMITTED.md` / `query-admit.md` |
| Skip id confirmation and analyze the requirement immediately | 🔴 Critical | MUST propose an id first and wait for user confirmation |
| Read code in parallel while confirming the id | 🟡 Violation | Id confirmation is a standalone step; do not parallelize with code exploration |
| Create the requirement directory without prompting the user | 🔴 Critical | MUST show the suggested id; create only after the user confirms |
| Run git log / git diff to explore changes before the requirement id is confirmed | 🟡 Violation | Confirm the id first, then explore change history |

**Only exception**: the user already wrote a requirement id in the message (e.g. `requirement change: mgmt-unicast-key-derivation xxx`). The id is then confirmed and analysis may start.

**Self-check list (MUST ask yourself first whenever requirement intent is detected):**
1. Have I already proposed a requirement id to the user? If not → propose it immediately
2. Has the user already confirmed the id? If not → wait for the user reply
3. Have I already created `00-original-requirements.md` + `CHANGELOG.md`? If not → create them before continuing
4. Before step ④ requirements analysis, have I run the fact gate and read admit results? If not → MUST run `verify-kb-facts.js --query` first, then analyze

---

## 2. Trigger keywords

| Keyword | Triggers | Notes |
|---------|----------|-------|
| `requirement:` `requirement ` `requirements analysis` `requirements analysis:` `analyze requirements` | Task 3 requirements analysis | Read PLACET.md + the Placet delegation guide → read the Agent file and execute |
| `generate PRD` `PRD` | Task 4 PRD | Same |
| `software design` `change strategy` | Task 5 design | Same |
| `implement code` `start coding` | Task 6 code implementation | Same |
| `test cases` `regression verification` | Task 7 test cases | Same |
| `test report` `run tests` | Task 8 test report | Same |
| `requirement change` `change requirement` `requirement change:` | Task 9 requirement change | Same |
| `update knowledge base` `knowledge base update` | Task 8.5 knowledge-base update | Use placet-knowledge-base-update |
| `verify knowledge` `fact gate` `admit knowledge` | Knowledge-base fact gate | Use placet-knowledge-fact-gate |
| `generate knowledge base` `project knowledge base` `PROJECT_KNOWLEDGE_BASE` | Task 2 knowledge base | Use placet-knowledge-base |
| `view status` | Project status | Use placet-status |
| `activate Placet` `start pipeline` `placet` | Activate Placet | Use placet-init |

> **Confirmation rule**: clear feature-development / code-change intent → enter the pipeline directly. Ambiguous intent (check, audit, scan, etc.) → ask the user whether to use the pipeline.

---

## 3. Output-path rules (highest priority)

- All documents go to the **target project directory**; never to the framework directory
- One requirement, one directory: `[target-project]/docs/{requirement-id}/`
- Shared knowledge base: `[target-project]/docs/knowledge-base/`
- Test code: `[target-project]/tests/{requirement-id}/`

### 3.1 Target project path

> **Core principle: the target project path is specified once, then inherited automatically. If it can be detected, do not ask the user.**

**First-trigger rules:**
- When a Placet keyword fires, resolve the target project in this order:
  1. The user already specified it in this session → **inherit automatically; do not ask again**
  2. The current working directory is **not** the framework directory → **treat it as a candidate path** and ask: "Detected current directory `<path>`. Use it as the target project?"
  3. Neither of the above → ask: "Please provide the target project path (e.g. `target project: D:\my-app`)"
- After the path is confirmed, the AI **remembers it for the rest of this session** and uses it for every later stage

**Examples:**
```
# First time (claude started in the framework directory; no target project yet)
User: requirements analysis: user login module
AI:   Please provide the target project path (e.g. target project: D:\my-app)

# First time (claude started in a project directory)
User: /placet-init
AI:   Detected current directory D:\my-app. Use it as the target project?
User: yes

# Later (target project already confirmed)
User: requirements analysis: user login module
AI:   [target project D:\my-app remembered] suggested requirement id: user-login...
```

### 3.2 Requirement-directory conflict
- If `[target-project]/docs/{requirement-id}/` already exists, **MUST prompt the user**:
  "⚠️ Requirement directory `docs/{requirement-id}/` already exists. Choose: 1) keep using the existing directory (incremental append) 2) pick a different requirement id 3) overwrite the existing directory (existing docs will be lost)"
- MUST NOT write any files until the user explicitly chooses

---

## 4. Task 3 execution order (MUST — mandatory, do not reorder, do not skip)

**Every step is blocking. Wait for user confirmation before the next step.**

```
Requirement intent detected
    │
    ▼
① Propose a requirement id (AI MUST auto-suggest a kebab-case English id from the description)
    │  MUST: only propose the id; do not read code, docs, or run git
    │  MUST: wait for the user to confirm
    │
    ▼
② User confirms the id (the user may adjust it; AI MUST wait for explicit confirmation)
    │
    ▼
③ Create 00-original-requirements.md + CHANGELOG.md (MUST before any analysis)
    │  MUST: finish this before any Read/Glob/Grep/git operation
    │
    ▼
④ Requirements analysis (depth follows S/M/L)
    │  ④.1 Fact-gate the knowledge base first, then read it (MUST):
    │      - Run node "$FRAMEWORK/skills/placet-knowledge-fact-gate/scripts/verify-kb-facts.js" "<target-project>" --query "<current requirement keywords>"
    │      - Treat only pass rows in PROJECT_KNOWLEDGE_ADMITTED.md / .verified/query-admit.md as current fact
    │      - fail MUST NOT be treated as fact; drill into source when needed
    │      - docs/knowledge-base/PROJECT_KNOWLEDGE_BASE.md (structure clues; paths/symbols follow admit results)
    │      - docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md (module clues; same)
    │      - Related PUML flow diagrams (pick by modules involved)
    │      - Same-domain topic docs (e.g. CRYPTO_INTL.md / PBKDF2_KEY_DERIVATION.md, matched by requirement keywords)
    │  ④.2 Then read related source and requirement docs
    │  Note: knowledge-base reads are not blocked by the requirement-id gate; the fact gate does not restrict reading source
    │
    ▼
⑤ 🔴 Level assessment → user confirms the level → later stages follow that level
```

> **`00-original-requirements.md` MUST be created immediately after the requirement id is confirmed, before any analysis.**
> Level assessment happens during/after requirements analysis. Analysis depth is guided by a preliminary level; the final level is confirmed by the user.
> **Violating this order (e.g. reading code before steps ①–③ finish) is a process violation: stop immediately and return to step ①.**

---

## 5. Original-requirements record template

Immediately after the requirement id is confirmed, create `[target-project]/docs/{requirement-id}/00-original-requirements.md` and `[target-project]/docs/{requirement-id}/CHANGELOG.md`:

**00-original-requirements.md:**

```
# Original Requirements Record

## Basic information
| Field | Content |
|-------|---------|
| Requirement id | {requirement-id} |
| Requirement name | {user's original requirement description} |
| Recorded at | YYYY-MM-DD HH:MM |
| Target project | {absolute path} |
| Change level | (fill after leveling) |

## Original requirement description
(the user's original natural-language requirement, kept verbatim; do not edit or summarize)

## Clarification log
(user answers to AI questions during requirements analysis, recorded item by item)
```

> **Change history**: if a later requirement change (Task 9) occurs, append records in `CHANGELOG.md`; do not duplicate them in `00-original-requirements.md`.

**CHANGELOG.md:**

```
# Change History

## Knowledge Base Anchor

> Filled during Task 3 requirements analysis; updated when Task 8.5 completes. **The only write location**; do not repeat in 00/01/02/03 development docs.

- Knowledge-base version: (to fill, e.g. vX.Y)
- Module domains involved: (to fill)
- Related flow diagrams: (to fill, e.g. ota_flow.puml)
- Expected changes: (to fill)
- Details: [PROJECT_KNOWLEDGE_DETAIL.md](../knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md)

## Change 1: Initial requirement
- Status: ✅ Done
- Date: YYYY-MM-DD
- Stages affected: all
- Notes: Initial requirement created
```

---

## 6. Requirement-id rules

1. AI MUST auto-suggest an English id (kebab-case) from the requirement description
2. **MUST ask the user to confirm**; create the directory only after confirmation
3. Example: `Requirement [user login module] suggested English id: user-login. Adjust?`
4. **MUST wait for the user reply**: do not proceed until the user explicitly confirms or adjusts the id
5. After the id is confirmed, MUST immediately create `docs/{id}/00-original-requirements.md` and `docs/{id}/CHANGELOG.md`; only then may code be read

---

## 7. Level criteria

| Level | Criteria | Flow difference |
|-------|----------|-----------------|
| S | ≤3 files | Skip PRD, design, test cases |
| M | 4–15 files or 2–3 modules | TDD, full flow |
| L | >15 files or cross-module | change-strategy, regression checklist |

> See `CLAUDE.md` for the full level-adaptation table

---

## 8. Knowledge Base Anchor rules

- If a knowledge base exists, each requirement's `CHANGELOG.md` MUST include a `## Knowledge Base Anchor` section (version, module domains, flow diagrams, expected changes)
- Every document MUST end with a change-history table (version, date, change scope, notes)

## 9. Closed loop

After the test report is done → **MUST** run an incremental knowledge-base update (do not rescan the whole project).

## 10. Recommended tool: CodeGraph

- `codegraph build` — pre-generate the dependency graph to improve module analysis
- `codegraph fn-impact <function>` — compute change-impact radius precisely
- `codegraph dead-code` / `codegraph check` — dead-code detection / CI gate
- Install: `npm install -g @optave/codegraph` (optional; Node >= 22.12.0; the knowledge-base Skill auto-runs `codegraph build` when the CLI is available)
- Windows install failure / leftover repair: see [docs/CodeGraph-install-guide.md](../docs/CodeGraph-install-guide.md)

## 11. Requirement–knowledge-base bidirectional link rules (MANDATORY)

**Every time a requirement finishes (after the test report), MUST update the DETAIL knowledge base — not just append a log row.**

### 11.1 What to update (more than the history table)

DETAIL updates MUST include these three categories:

| Category | Content | Example |
|----------|---------|---------|
| **Requirement Index** | Append/update one Requirement Index row | id, name, level, modules involved, version |
| **Module description** | Sync functional description, function list, and data formats for modules involved | log_wrapper adds `get_ap_mac_str()`; beacon_exchange adds `read_kdf_EncKey_plain()` |
| **Change history** | Append an update-history row | version, date, change scope, notes |

**Anti-pattern**: only add an update-history row and leave module descriptions unchanged → the knowledge base goes stale, same as having none.

### 11.2 Knowledge base → requirements: Requirement Index

**The Requirement Index and change history MUST be maintained in the DETAIL file first**, with this fallback:

```
Does DETAIL exist?
  ├── Yes → update DETAIL (Requirement Index + update history)
  └── No  → update BASE (Requirement Index + update history)
```

BASE vs DETAIL duties:

| File | Role | Update frequency |
|------|------|:----------------:|
| `PROJECT_KNOWLEDGE_DETAIL.md` | Deep analysis, API list, **Requirement Index, change history** (preferred) | Every completed requirement |
| `PROJECT_KNOWLEDGE_BASE.md` | Project overview, architecture, module index, tech stack | Architecture changes only / fallback when DETAIL is missing |

Requirement Index format (place in DETAIL above the update-history section):

```markdown
## Requirement Index

| Requirement id | Name | Level | Modules involved | Completed in |
|----------------|------|:-----:|------------------|-------------:|
| user-login | User login module | S | login.lua, auth.lua | v6.1 |
```

- New requirement: append an index row + an update-history row in DETAIL
- Changed requirement: update the "Modules involved" column in DETAIL
- BASE is updated only for structural changes (architecture / packaging / deployment)

### 11.3 Requirement → knowledge base: document anchors

Each requirement's `CHANGELOG.md` MUST include a `## Knowledge Base Anchor` section pointing at DETAIL (**the only write location**; do not repeat in 00/01/02/03 development docs):

```markdown
## Knowledge Base Anchor
- Knowledge-base version: vX.Y
- Module domains involved: Phase 2 - module1, module2
- Related requirements: [[other-req-id]]
- Details: [PROJECT_KNOWLEDGE_DETAIL.md](../knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md)
```

### 11.4 When to update

| When | File | Action |
|------|------|--------|
| S/M/L flow completes | DETAIL | Update Requirement Index + update history |
| Requirement change completes | DETAIL | Update the modules-involved column |
| Architecture / deployment change | BASE | Update the matching Phase chapter |
| Full knowledge-base rebuild | BASE + DETAIL | Sync all anchor version numbers |

### 11.5 Self-check list

When a requirement finishes, MUST confirm:
- [ ] DETAIL Requirement Index is updated
- [ ] DETAIL functional descriptions, function lists, and data formats for modules involved are synced
- [ ] DETAIL update history is appended
- [ ] CHANGELOG.md has a `## Knowledge Base Anchor` section (pointing at DETAIL)
- [ ] BASE does not need an update (unless architecture changed)
