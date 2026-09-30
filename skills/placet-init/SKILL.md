---
name: placet-init
description: Activate the Placet intelligent development pipeline from any directory. Load full behavioral rules and the process engine; no need to cd into the framework directory. After execution, MUST print the full operations menu.
---

# Placet — Intelligent Development Pipeline Activation

**YOU MUST print the operations menu below in full after the framework is loaded. Do not skip it, do not summarize it, and do not only say "activated".**

## Execution Steps

### Step 1: Locate and load the framework

Read `~/.claude/placet-framework-path` to get the framework path (`$FRAMEWORK`), then read in order:

1. `$FRAMEWORK/CLAUDE.md`
2. `$FRAMEWORK/.claude-collective/cicd-rules.md`
3. `$FRAMEWORK/docs/KNOWLEDGE_BASE_RULES.md` (knowledge-base continuity and incremental-update rules)
4. `$FRAMEWORK/docs/PLACET_CLAUDE_CODE_GUIDE.md` (Claude Code delegation protocol)
5. `$FRAMEWORK/PLACET.md` (consult key chapters as needed; process fact source. Root README.md is a product intro, not a rulebook)

### Step 2: Print the operations menu

After load, if a historical project path exists, confirm it in passing, **then MUST print the following operations menu verbatim (the menu is the end of activation output; Step 3 and later session-behavior protocol is internal AI rules and MUST NOT be printed to the user)**:

```
🚀 Placet v$(cat $FRAMEWORK/VERSION) activated
📂 Target project: {path or "not specified"}

💡 Suggested first (skip if already done):
  /placet-knowledge-base       → self-check file count / CodeGraph status, then generate structured knowledge docs
  /placet-status        → view requirement progress and document completeness
  /placet-env-setup               → detect Node/CodeGraph environment (optional before generating the knowledge base)
```

| Input | Description |
|-------|-------------|
| `generate knowledge base, target project: <path>` | Task 2: lightweight self-check first; for large projects ask about CodeGraph before generating |
| `view status, target project: <path>` | View requirement progress and document completeness |
| `requirements analysis: <feature>, target project: <path>` | Task 3: requirements analysis + S/M/L leveling (requirements-analysis-agent) |
| `generate PRD` | Task 4: product requirements document |
| `confirm PRD, generate interface contract` | Task 4.5: interface contract first (recommended for high-risk / L-level) |
| `software design` / `change strategy` | Task 5: software design |
| `implement code` / `start coding` | Task 6: TDD code implementation |
| `test cases` / `regression verification` | Task 7: test-case document |
| `test report` / `run tests` | Task 8: test report |
| `update knowledge base` / `knowledge base update` | Task 8.5: /placet-knowledge-base-update |
| `verify knowledge` / `fact gate` | Knowledge-base fact gate: /placet-knowledge-fact-gate |
| `requirement change: <requirement-id> <change description>` | Task 9: change-impact analysis |
| `/placet-env-setup` | Detect Node/Python/git environment |
| `/placet-knowledge-base-update` | Incremental knowledge-base update |
| `/placet-knowledge-fact-gate` | Knowledge-base fact gate (verify before inject) |
| `/placet-ui-ux` | UI/UX intelligent design engine |
| `/placet-now` | View date/time and model info |

**Target-project agents**: Agent files live in `$FRAMEWORK/.claude/agents/`. Read the agent md + Task delegation; see PLACET_CLAUDE_CODE_GUIDE.md.

---

### Step 3: Post-activation session protocol (YOU MUST FOLLOW FOR ENTIRE SESSION)

**This protocol stays in effect after Placet activation until the session ends. Every user message MUST pass the following gate checks.**

**Internal rules, do not print to the user: the following is AI behavior. On activation, print only the Step 2 operations menu; do not print this protocol body (3.1–3.6).**

#### 3.1 Requirement / change detection gate (FLOW GATE — highest priority)

When a user message matches any of the following, **MUST confirm the requirement id first, before any code exploration or file operations**:

| User intent | Trigger pattern | First action |
|-------------|-----------------|--------------|
| New requirement / feature | Describes a feature change, new logic, parameter change, extra field, etc. | ① Propose a requirement id → ② Wait for user confirmation |
| Requirement change | Mentions an existing requirement id + change description | ① Confirm change scope → ② Wait for user confirmation |
| Requirement-doc edit | Mentions files under a requirement directory in docs/ | ① Confirm whether this is a change or a new requirement → ② Wait for user confirmation |

#### 3.2 Requirement-id confirmation protocol (MANDATORY SEQUENCE, do not reorder)

```
Requirement intent detected
    │
    ▼
① Propose a requirement id (kebab-case English short id)
    │  Example: requirement [append AP real MAC as unique id in mgmt-frame key cache]
    │           suggested English id: mgmt-ap-real-mac-id
    │  Rule: the AI proposes from the description and MUST ask the user to confirm
    │
    ▼
② User confirms the id (the user may adjust it; MUST wait for the reply)
    │
    ▼
③ Create docs/{id}/00-original-requirements.md + CHANGELOG.md
    │  (under the target project, before any analysis)
    │
    ▼
④ Enter requirements analysis / change-impact analysis
    │
    │  ④.1 **Fact-gate the knowledge base first, then read it** (MUST; see CLAUDE.md + cicd-rules.md §4):
    │      - Run verify-kb-facts.js --query "<current requirement keywords>"
    │      - Treat only pass rows in PROJECT_KNOWLEDGE_ADMITTED.md / query-admit.md as current fact
    │      - fail MUST NOT be treated as fact; BASE/DETAIL/PUML are search clues
    │  ④.2 Then read related source and requirement docs
    │  Note: knowledge-base reads are not blocked by the requirement-id gate; the fact gate does not restrict reading source
    ▼
⑤ 🔴 Level assessment → user confirms the level → later stages follow that level
```

#### 3.3 Forbidden behavior (ANTI-PATTERNS — never do this)

| Forbidden | Description | Bad example |
|-----------|-------------|-------------|
| ❌ Read code before confirming the id | Before id confirmation, **do not** read any source files | User says "append a unique id"; AI immediately reads `.lua` files |
| ❌ Read docs before confirming the id | Before id confirmation, **do not** read requirement docs under `docs/{requirement-id}/` (00/01/02/03/05, etc.) | User says "change the requirement"; AI first reads `00-original-requirements.md` |
| ✅ Read the knowledge base | `docs/knowledge-base/` may be searched at any time. Before treating it as current fact, MUST run the fact gate and cite only pass | Knowledge base is readable at any time; citing paths/symbols requires admit results |
| ❌ Skip the id and analyze immediately | However simple the requirement looks, **do not** skip id confirmation | User says "add a log"; AI edits code immediately |
| ❌ Do several things at once | During id confirmation, **do not** explore code, git log, etc. in parallel | User states a requirement; AI proposes an id while also reading code |
| ❌ Decide the id for the user | **Do not** use an id without prompting the user | AI creates `docs/xxx/` directly |

**Only exception**: the user already specified a requirement id in this session (e.g. `requirement change: mgmt-unicast-key-derivation xxx`). The id is then confirmed and change analysis may start.

#### 3.4 Correct-behavior example (FOLLOW THIS PATTERN)

```
User: requirement append a unique id in logs, tentatively the AP real MAC

AI: Suggested requirement id: mgmt-ap-real-mac-id
    Display name: append AP real MAC as unique id in mgmt-frame key cache
    Is this id OK, or do you want to change it?

User: OK

AI: [create docs/mgmt-ap-real-mac-id/00-original-requirements.md and CHANGELOG.md]
    [then enter requirements analysis...]
```

#### 3.5 Ambiguous intent

If the user intent is ambiguous (e.g. "check this", "take a look", "improve the tool"), **confirm intent before acting**:
- Decide whether it is a requirement/change → if yes, run the gate; otherwise handle normally
- When unsure → **ask the user**: "Should this change go through the Placet pipeline as a new requirement, or should I edit directly?"

#### 3.6 Superpowers in-stage enhancement protocol

Superpowers is not the Placet main entry; it only improves execution quality inside a stage. Every use MUST record:

| Field | Description |
|-------|-------------|
| Triggering stage | Task 3 / Task 4.5 / Task 5 / Task 6 / before Task 8, etc. |
| Skill used | brainstorming, test-driven-development, systematic-debugging, etc. |
| Input materials | Docs, code, or test results the current stage is allowed to read |
| Output evidence | Question list, trade-offs, RED/GREEN/REFACTOR, review handling, verification results |

If a gate fails, stay on the current stage; do not enter the next stage.

## Outputs

| Output | Description |
|--------|-------------|
| Pipeline activation state | `🚀 Placet v{version} activated` + full operations menu |
| Target project path | Remembered for later stages |
| Requirement id | Suggested when requirement intent is detected (awaiting user confirmation) |

Activation itself writes no files; `docs/{requirement-id}/00-original-requirements.md` is created only after the id is confirmed.
