# Using Placet in Claude Code

> Goal: start Claude Code in the **target project directory**, run the full Placet pipeline, and not depend on `/van` or `@agent` discovery under the framework directory.

---

## 1. How to start (one narrative)

**Recommended**: start Claude Code in the target project directory (or any directory). First message:

```
/placet-init
```

The Skill reads `~/.claude/placet-framework-path` and loads `$FRAMEWORK/CLAUDE.md` and `cicd-rules.md`.

**Optional**: start inside the framework directory `placet`; that also works. `/van` and in-framework Agent definitions can Tab-complete in that directory.

| Mode | Directory | `/placet-*` Skills | `/van` | Framework Agents |
|------|-----------|:---------------:|:------:|:----------------:|
| Recommended | Target project | ✅ | ❌ | Delegate via Skill |
| Optional | Framework root | ✅ | ✅ | ✅ |

---

## 2. Target-project session: Agent delegation protocol

In a target-project directory, **do not assume** `@requirements-analysis-agent` and similar names are auto-discovered by Claude Code.

**Standard delegation pattern** (all pipeline stages):

```
1. Read ~/.claude/placet-framework-path → $FRAMEWORK
2. Read $FRAMEWORK/.claude/agents/{agent-name}.md in full
3. Task(subagent_type="generalPurpose", prompt="Execute per the following Agent spec:\n{full agent md}\n\nTask context:...")
4. Write outputs to the target project docs/{requirement-id}/; do not write to the framework directory
```

> **Claude Code delegation note**: `@agent` is not auto-discovered in Claude Code. **The source of truth is “read the Agent file + execute in the main session”.** Injecting the full agent md via `Task(generalPurpose)` is one Claude Code implementation. In Cursor / other IDEs, the main session may instead read the file and follow the agent spec directly. Both MUST strictly follow the rules in the agent md.

| Task | Keyword | Agent file | Skill fallback |
|------|---------|------------|----------------|
| 2 Knowledge base | `generate knowledge base` | — | `/placet-knowledge-base` |
| 2.5 Fact gate | `verify knowledge` / before Tasks 3–9 treat the KB as fact | — | `/placet-knowledge-fact-gate` |
| 3 Requirements analysis | `requirements analysis` | `requirements-analysis-agent.md` | Main session + Agent delegation |
| 4 PRD | `generate PRD` | `prd-generation-agent.md` | Main session + Agent delegation |
| 4.5 Interface contract first | Enable on high-risk projects after PRD confirmation | `software-design-agent.md` or main session | Main session + Agent delegation |
| 5 Design | `software design` | `software-design-agent.md` | Main session + Agent delegation |
| 6 Coding | `implement code` | `code-implementation-agent.md` | Main session + Agent delegation |
| 7 Test cases | `test cases` | — | Main session + Agent delegation |
| 8 Report | `test report` | — | Main session + Agent delegation |
| 8.5 KB incremental | `update knowledge base` | — | `/placet-knowledge-base-update` |
| 9 Change | `requirement change` | `change-request-agent.md` | Main session + Agent delegation |
| — Status | `view status` | — | `/placet-status` |

After Task 2 (knowledge base) enters the Skill, MUST first run `preflight-kb` lightweight self-check and show source-file count, project size, whether it is a large project, and CodeGraph Status; for large projects MUST ask whether to use CodeGraph, and only then run `codegraph build`. After generate or incremental update, MUST run `verify-kb-facts.js` to refresh the admit list. Before Tasks 3/4/5/6/9 treat the knowledge base as current fact, MUST run the fact gate with `--query` and cite only pass.

---

## 3. View status of all requirements

After a new session or a project switch, use the status Skill to **restore context and list every requirement** (not a single-requirement summary):

```
/placet-status
```

or:

```
view status, target project: D:\your-project
```

Scan scope:

| Source | Path |
|--------|------|
| Requirement docs | `{project}/docs/{requirement-id}/` (exclude `knowledge-base`) |
| Requirement Index | `docs/knowledge-base/PROJECT_KNOWLEDGE_DETAIL.md` → `## Requirement Index` |
| Test code | `{project}/tests/{requirement-id}/` (if present) |

Runnable scan (recommended from inside the Skill):

```bash
node "$FRAMEWORK/skills/placet-status/scripts/scan-status.js" "D:\your-project"
```

Output is a Markdown table: each requirement's level, status, current stage, missing docs; plus orphan items where KB and docs disagree.

---

## 4. Placet vs Collective boundary

| Path | Purpose | Trigger |
|------|---------|---------|
| **Placet** | requirement → PRD → design → code → test → report | `/placet-init` + natural language / `/placet-*` |
| **Collective research** | TaskMaster, hub-spoke experiments | Framework directory only: `/van` + TaskMaster |

The Placet pipeline **does not depend** on TaskMaster MCP. The current version supports unit tests only: Task 6 unit tests are done by `code-implementation-agent` or the main session; Task 7 unit-test case docs and Task 8 unit-test reports are done by the main session + Agent delegation. Integration tests, E2E, and Playwright are deferred.

Superpowers is only an in-stage enhancement layer for Placet. When delegating an Agent, if Superpowers is enabled for the current stage, the prompt MUST also include:

- Current Placet stage and S/M/L level
- Superpowers skill name in use
- Input files allowed to read
- Output evidence that MUST be returned, e.g. boundary-question list, RED/GREEN/REFACTOR, review handling, verification test results

Do not use Superpowers trigger words to bypass Placet requirement-id confirmation, human confirmation, or stage gates.

---

## 5. Recommended workflow

```bash
cd D:\your-project
claude
```

```
/placet-init
/placet-status
generate knowledge base, target project: D:\your-project
requirements analysis: xxx, target project: D:\your-project
generate PRD
confirm PRD, generate interface contract
software design
confirm design, start coding
confirm code, generate test cases
confirm cases, generate test report
update knowledge base
```

---

## 6. Install and update

```bash
cd placet
bash install.sh          # install Skills + record placet-framework-path
bash update-skills.sh    # update Skills + refresh framework-path
```

After install, `placet-*` Skills live in `~/.claude/skills/` (`placet-init`, `placet-knowledge-base`, `placet-knowledge-base-update`, `placet-knowledge-fact-gate`, `placet-status`, `placet-context-compress`, `placet-skill-eval`, `placet-env-setup`, `placet-ui-ux`, `placet-now`).
