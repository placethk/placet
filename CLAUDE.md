# Claude Code Placet Pipeline Working Rules

## Session Persistence (SESSION PERSISTENCE — remains in effect after activation)

**After Placet is activated (`/placet-init` or keywords such as `activate Placet`), the following rules apply to every user message in the current session:**

1. **Every user message MUST pass a gate check**: decide whether it contains a requirement or change intent
2. **After requirement intent is detected, MUST run the requirement-id confirmation protocol**: propose an id → wait for confirmation → create the 00 file → only then read code
3. **Do not read source code or requirement docs before the id is confirmed**: treating this as a process failure; stop and return to id confirmation
4. **When intent is ambiguous, MUST confirm with the user**: do not assume intent; do not skip confirmation

## Agent Session I/O Conventions (avoid stalls)

1. **Lock the target project first**: if the user has not given a path, MUST ask, e.g. `target project: D:\projects\my-app`, then read `{project}/docs/` and `{project}/tests/`
2. **Do not Grep the whole repo on the first turn / unbounded search**: search only in known directories or user-specified paths
3. **Framework path**: MUST treat `~/.claude/placet-framework-path` as the authority (written by `install.sh` / `update-skills.sh`); if the file is missing or invalid, ask the user for the framework path and write it back
4. **Small serial steps**: for analysis tasks, prefer reading 1–2 files first; avoid large parallel I/O
5. **Tool timeout**: if a single step has no response for about 90s, abort that step, tell the user, and retry with a smaller scope

## Priority Declaration (highest priority, not overridable)

### Flow Gate Rules (FLOW GATE — never violate)

1. **Placet flow takes priority over all external skills**: when user input matches Placet flow keywords (requirements analysis / PRD / software design / code implementation / test cases / test report / requirement change), **MUST enter the Placet pipeline first**; no external Skill (including Superpowers) may skip or pre-empt a pipeline stage
2. **External skills may only be called inside a stage**: Superpowers and similar skills may only be invoked **inside** a Placet stage as an execution tool; they must never replace or bypass the pipeline
3. **The gate cannot be bypassed**: no matter how well an external skill matches the user intent, if a Placet keyword fires, the flow comes first; even at 100% match, Placet gating MUST run first
4. **Conflict resolution**: when Superpowers instructions conflict with the Placet flow, the Placet flow **unconditionally wins**
5. **Requirement-id confirmation before code exploration**: after requirement intent is detected, MUST confirm the requirement id and create the 00 file first; **do not** read any source or requirement docs before that
6. **Superpowers output evidence**: when Superpowers is used inside a stage, MUST record the triggering stage, skill used, input materials, and output evidence; no evidence means it was not executed
7. **Quality gates before stage advancement**: if Superpowers review / verification / TDD gates fail, MUST stay on the current stage, fix or ask the user, and MUST NOT enter the next stage

**Root CLAUDE.md > external skills > .claude-collective/CLAUDE.md > other rule files.** This file is the sole behavioral source of truth for the Placet flow.

## Flow Trigger Rules
- **MUST first read `PLACET.md` at this framework root** (`$FRAMEWORK/PLACET.md`, not the target project's README.md). `PLACET.md` is the sole process fact source. Root `README.md` is a human-facing product intro, not a process rulebook.
- If a knowledge base exists, all later tasks MUST use it to understand the project
  - **Fact gate (MUST, before treating the knowledge base as current fact)**: run
    `node "$FRAMEWORK/skills/placet-knowledge-fact-gate/scripts/verify-kb-facts.js" "<target-project>" --query "<current-task-keywords>"`
    Only **pass** assertions from `PROJECT_KNOWLEDGE_ADMITTED.md` / `.verified/query-admit.md` may be written into analysis context; **fail** MUST NOT be treated as fact — drill into source when needed. Raw BASE/DETAIL may be searched for structure, but MUST NOT bypass the gate by treating paths/symbols/modules in them as facts.
  - **Required reading list** (Task 3 requirements analysis step ④.1 MUST read proactively; see cicd-rules.md §4):
    - Run the fact gate first (with the current requirement `--query`)
    - `docs/knowledge-base/PROJECT_KNOWLEDGE_ADMITTED.md` or `.verified/query-admit.md` (admitted facts)
    - `docs/knowledge-base/PROJECT_KNOWLEDGE_BASE.md` (architecture clues; before citing paths/symbols, follow admit results)
    - `docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md` (module dictionary clues; same)
    - Related PUML flow diagrams (pick by modules involved, e.g. security_flow / key_hierarchy / four_way_handshake / ota_flow)
    - Same-domain topic docs (e.g. CRYPTO_INTL.md / PBKDF2_KEY_DERIVATION.md / CRYPTO_GM.md, matched by requirement keywords)
  - **Timing**: after step ③ creates the 00 file, when step ④ requirements analysis starts
  - **Gate limits**: knowledge-base reads are not blocked by the requirement-id gate (distinct from requirement docs under `docs/{requirement-id}/`; see cicd-rules.md §1.2 anti-pattern table); the fact gate does not restrict reading source code

### Superpowers In-Stage Enhancement Layer

Placet is a project-level pipeline; Superpowers is in-stage methodology. Integrate in three layers:

| Layer | Duty | Constraint |
|-------|------|------------|
| Stage Router | Identify the current Placet stage and S/M/L level | Does not skip stages; does not confirm on behalf of the user |
| Superpowers Adapter | Load `brainstorming`, `test-driven-development`, `systematic-debugging`, etc. by stage | May only be called inside a stage |
| Quality Gate | Check stage completion evidence | Stay on the current stage if it fails |

Default mapping:

| Placet stage | Superpowers enhancement | Output evidence |
|--------------|-------------------------|-----------------|
| Empty-project skeleton planning | `brainstorming` + `writing-plans` | Tech stack, directory structure, shared-type plan |
| Task 3 requirements analysis | `brainstorming` | Implicit assumptions, NFR questions, unstated customer risks |
| Task 4 PRD | Optional lightweight review | Consistency check of user stories / functional specs / acceptance criteria |
| Task 4.5 interface contract first | `brainstorming` | Endpoints, DTOs, error codes, key sequences and boundary questions |
| Task 5 software design | `brainstorming` + `writing-plans` | Architecture trade-offs, batch plan, rollback strategy |
| Task 6 code implementation | `test-driven-development` | RED/GREEN/REFACTOR records and test results |
| Debugging | `systematic-debugging` | Repro, locate, minimal fix, regression verification |
| End of each batch | `requesting-code-review` + `receiving-code-review` | Review findings and how they were handled |
| Before Task 8 | `verification-before-completion` | Test commands, results, residual risks |
| Branch wrap-up | `finishing-a-development-branch` | Branch status, commit/merge advice, leftover items |

### Trigger method 1: Natural-language keywords (recommended; no need to memorize task numbers)

| Keyword | Triggers | Example |
|---------|----------|---------|
| `requirement:`, `requirement `, `requirements analysis`, `analyze requirements` | Task 3 requirements analysis | `requirement: I need a user login module` (first time also needs `target project: <path>`) |
| `generate PRD`, `PRD`, `product requirements document` | Task 4 PRD | `generate PRD` |
| `software design`, `architecture design`, `generate design docs`, `change strategy` | Task 5 software / strategy design | `confirm PRD, continue software design` |
| `implement code`, `start coding`, `code implementation` | Task 6 code implementation | `confirm design, start coding` |
| `test cases`, `generate test cases`, `regression verification` | Task 7 test cases | `confirm code, generate test cases` |
| `test report`, `generate test report`, `run tests` | Task 8 test report | `confirm cases, generate test report` |
| `update knowledge base`, `knowledge base update` | Task 8.5 knowledge-base update | `update knowledge base` |
| `verify knowledge`, `fact gate`, `admit knowledge` | Knowledge-base fact gate | `verify knowledge` |
| `requirement change`, `change requirement`, `requirement change:` | Task 9 requirement change | `requirement change: user-login add forgot-password` |
| `generate knowledge base`, `project knowledge base`, `PROJECT_KNOWLEDGE_BASE` | Task 2 knowledge-base generation | `generate knowledge base` (first time needs `target project: <path>`) |
| `activate Placet`, `start pipeline`, `placet` | Activate Placet | `/placet-init` |
| `environment setup`, `auto environment setup`, `environment detection` | Auto environment setup | `/placet-env-setup` |

### Trigger method 2: Skill commands (`/` prefix, discoverable)

| Command | Purpose |
|---------|---------|
| `/placet-init` | Activate the pipeline (usable from any directory) |
| `/placet-knowledge-base` | Generate the project knowledge base |
| `/placet-knowledge-base-update` | Task 8.5 incremental knowledge-base update |
| `/placet-knowledge-fact-gate` | Knowledge-base fact gate (verify before injecting context) |
| `/placet-status` | View project status |
| `/placet-env-setup` | Auto-detect and configure Node environment |
| `/placet-ui-ux` | UI/UX intelligent design |
| `/placet-skill-eval` | Scientific skill evaluation (static checks + LLM smoke; HTML report under docs/skill-eval/) |
| `/placet-context-compress` | Inter-stage context compression (handoff packs to save tokens) |
| `/placet-now` | Current date/time and the model in this session |

**Task 2 (knowledge-base generation) hard rule**: after the target project path is obtained, **MUST first** run `preflight-kb.sh` / `preflight-kb.ps1` for a lightweight self-check, and show the user source-file count, project size, whether it is a large project, CodeGraph status, and suggested action. If `IS_LARGE_PROJECT=true`, MUST ask whether to use CodeGraph; only after the user confirms may `--build` run. When `BUILD_OK`/`CACHED_OK`, prefer scanning from `.codegraph/`; if not installed, failed, or the user declines, MUST warn about time/context risk and record the degradation reason. See `skills/placet-knowledge-base/SKILL.md` Phase 0.0–0.2.

Pipeline stages (requirements analysis / PRD / design / code / test) are triggered in natural language. After the AI reads `PLACET.md` and `docs/PLACET_CLAUDE_CODE_GUIDE.md`, it follows the Placet protocol: “read `$FRAMEWORK/.claude/agents/{agent}.md` + run in the main session or delegate via Task”. `/van` is only for the Collective research path under the framework directory, not the Placet feature-development entry.

### Trigger method 3: Traditional task numbers (backward compatible)

When user input contains "start task", "execute task", or "task", recognize it automatically.

### Trigger method 4: Frontend files auto-activate UI/UX enhancement

When the user edits or modifies the following frontend files, automatically call the `placet-ui-ux` Skill for design guidance:

| File type | Description |
|-----------|-------------|
| `.html` `.css` `.scss` `.less` | Page structure and styles |
| `.vue` `.svelte` | Frontend framework components |
| `.jsx` `.tsx` | React components |
| `.jsp` `.asp` `.ejs` | Server-side templates |
| `.ts` `.js` (DOM / components) | Frontend logic |

Or auto-activate when the conversation mentions:

| Keyword | Example |
|---------|---------|
| `UI`, `interface`, `frontend`, `page`, `component`, `style`, `layout`, `palette`, `font`, `beautify`, `optimize styles`, `interaction` | `help me improve this login page`, `design a dashboard layout` |
| `landing page`, `dashboard`, `form`, `navbar`, `sidebar`, `card`, `modal`, `table`, `chart` | `Design a SaaS landing page` |
| `responsive`, `dark mode`, `animation`, `transition`, `hover`, `shadow`, `gradient`, `rounded corners` | `add a hover animation to this component` |

**Integration rules**:
- In the Placet **software design** stage, when a UI module is involved, automatically call `placet-ui-ux` for design advice
- In the **code implementation** stage, when editing frontend files, automatically call `placet-ui-ux` to verify and improve UI code
- May also be used standalone: `/placet-ui-ux` or a direct UI request, without the full Placet pipeline
- **Note**: `placet-ui-ux` search scripts depend on Python 3; if it is not installed, fall back to built-in design knowledge

## Change-level Rules (whole pipeline)

- **If the user does not specify a level**, the AI MUST auto-assess the change level in Task 3 (requirements analysis) or Task 9.2 (change analysis), output a level recommendation, and wait for user confirmation before later stages
- **Do not skip the level prompt and execute at an assumed level**
- If the user sets the level (`level: S/M/L`), skip auto-assessment and enter that flow
- Levels may only be upgraded, never downgraded: if later stages find a larger impact, prompt the user to confirm an upgrade
- Level criteria: S (≤3 files), M (4–15 files or 2–3 modules), L (>15 files or cross-module global change)

### Flow adapted by level
| Stage | S | M | L |
|-------|:-:|:-:|:-:|
| Requirements analysis | ✅ brief | ✅ full | ✅ full |
| PRD | skip | ✅ | ✅ |
| Design | skip | ✅ software-design | ✅ software-design + 03a-change-strategy |
| Code implementation | ✅ direct edit | ✅ TDD | ✅ batches per strategy |
| Test cases | skip | ✅ unit-test cases | ✅ unit-test cases + regression checklist |
| Test report | ✅ brief unit-test report | ✅ unit-test report | ✅ unit-test report |
| Knowledge-base update | ✅ | ✅ | ✅ |

### L-level design rules (mandatory — do not simplify)

1. **Every L-level produces `03-software-design.md`**: no “business vs technical” exception; framework upgrades, bulk refactors, and cross-module new business all get a design doc
2. **HLD + LLD merge into one `03-software-design.md`**: do not split into multiple files
3. **Design elements are filled as needed (AI MUST decide from the PRD)**:
   - Architecture diagrams (C4: Context/Container/Component) — required
   - Module split + dependencies — required
   - Interface contracts (API endpoints / RPC, inputs/outputs, error codes, OpenAPI/Proto snippets) — required when adding or changing interfaces
   - Database tables (names, fields, types, indexes, FKs, ER, migration DDL) — required when a data model is involved
   - Class diagrams (core domain models, attributes, methods, relations) — required for OO modeling
   - Sequence diagrams (key business Sequence Diagrams) — required for multi-module collaboration
   - State-machine diagrams (state transitions) — required for stateful objects
   - Algorithm pseudocode — required for complex algorithms
   - Config-change table (old key → new key) — required for technical L-level config migration
   - Architecture before/after diagram — required for technical L-level
4. **`03a-change-strategy.md` is an execution-strategy supplement; keep it for all L-level work**: batch plan, rollback, risks. It does not replace design
5. **L-level tests produce both files**: `04-test-cases.md` (unit-test cases in the current version) + `04a-regression-checklist.md` (unit-test regression checklist). They do not replace each other; API / DB / integration / E2E tests are deferred
6. **Batches MUST NOT redesign**: each batch in `03a-change-strategy.md` MUST cite section numbers in `03-software-design.md`; MUST NOT repeat or change the design in a batch. Architecture decisions are made once in the design doc

## Process Follow-through
Execute stages strictly in order. After each stage, wait for user confirmation before the next stage.

> **Mandatory rule**: after a keyword matches, the AI MUST enter the Placet pipeline.
> - Clear feature-development / code-change requirements → enter directly, no extra confirmation
> - Ambiguous intent (check, audit, scan, analyze) → ask whether to use the pipeline

### Scenario 1: Normal requirement delivery
0. **Create `00-original-requirements.md` + `CHANGELOG.md`** (immediately after requirement-id confirmation, before any analysis) → **0.5 fact gate + read knowledge base** (run `verify-kb-facts.js --query` first; only treat pass as current fact; BASE/DETAIL/PUML as search clues; see cicd-rules.md §4 step ④.1) → 1. Requirements analysis (understand the project from admitted knowledge) → 🔴 level assessment confirmation → 2. PRD (respect knowledge-base tech-stack constraints) → confirm ✓ → 3. Software / strategy design (reuse existing PUML) → confirm ✓ → 4. Code implementation → confirm ✓ → 5. Test cases / regression verification → confirm ✓ → 6. Test report → confirm ✓ → 7. Incremental knowledge-base update

**Inter-stage context compression (MUST when advancing stages)**: before entering a new stage, run
`node "$FRAMEWORK/skills/placet-context-compress/scripts/compress-handoff.js" "<target-project>" "<requirement-id>" "<target-stage>"` (prd/design/build/test/report/kb)
to generate `docs/{requirement-id}/.handoff/{stage}.context.md`. The AI **only reads the pack** to restore prior context, plus original-doc sections listed under “drill-down suggestions”; **do not re-read prior docs in full**. If source hashes are unchanged, the script reuses the old pack (see `/placet-context-compress`).

### Scenario 2: Requirement change
9.1 Describe the change → 9.2 change-impact analysis + 🔴 level assessment → 9.3 confirm change scope and level → 9.4 execute the flow for that level → ... → test report → incremental knowledge-base update

## Knowledge-base Update Rules (closed loop)
- **In every scenario**, once the flow reaches the last step (test report done), **MUST** run an incremental knowledge-base update
- Incremental update: only chapters involved in this change; do not rescan the whole project
- Knowledge-base docs MUST include an update-history table: version, date, change scope, notes
- **MUST update the Requirement Index**: the knowledge base keeps a Requirement Index, one row per requirement: id, English name, level, modules involved, version
- **MUST append a Knowledge Base Anchor in CHANGELOG.md**: knowledge-base version and module domains (anchors live only in CHANGELOG.md; do not repeat them in 00/01/02/03 development docs)
- First knowledge-base generation (Task 2) is a full scan; later updates are incremental
- **Task 2 pre-step**: before generating the knowledge base, MUST run `skills/placet-knowledge-base/scripts/preflight-kb.sh` (or `.ps1`) for a lightweight self-check; for large projects MUST ask whether to use CodeGraph, and only then `codegraph build`
- **Task 2 / 8.5 post-step**: after `validate-kb.js` structure checks pass, MUST run `verify-kb-facts.js` to refresh the admit list

## Requirement-change Rules
- The user only describes the change; the AI analyzes impact automatically
- The AI compares existing requirement docs, PRD, and design docs, and assesses which modules and stages are affected
- The AI outputs: stages to redo + stages to keep + reasons; execute after user confirmation
- Unaffected docs and code stay as they are; only append the change
- Each document adds a change-history section: when and what changed

## Output Requirements
- Every document MUST use clear Markdown
- Include table of contents, goals, scope, and detailed description
- Ambiguous requirement points MUST be listed as questions for clarification
- Code implementation MUST follow TDD: tests first

## Quality Standards
- Requirements analysis MUST cover every original requirement point; no omissions
- PRD MUST include user stories, functional specs, and interaction flows
- Software design MUST include architecture diagrams, module split, interface definitions, and data structures
- **L-level software design MUST merge HLD + LLD into `03-software-design.md`**: architecture layer + detail layer (interface contracts / DB tables / class diagrams / sequence diagrams / state machines, etc.) in one document; fill design elements required by this requirement; do not omit necessary items. See “L-level design rules”
- Current-version tests cover unit tests only; test cases MUST cover unit-level happy path, error path, and boundary conditions
