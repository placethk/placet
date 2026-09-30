# Placet Intelligent Pipeline — Quick Start

## 30-second overview

Placet lets you **drive the full development flow with one sentence**: requirements analysis → PRD → design → coding → tests → report.

```
# Start Claude Code in the project directory, activate, then talk
You: requirement: I need a user login module
AI:  evaluates the grade, generates requirement docs, waits for your confirmation, then continues
```

---

## Prerequisites

| Dependency | Version | Check |
|------|------|------|
| Node.js | >= 18 | `node -v` |
| git | any | `git --version` |
| Claude Code | latest | `npm install -g @anthropic-ai/claude-code` |
| CodeGraph (optional) | Node >= 22.12.0 | `npm install -g @optave/codegraph` (`install.sh` does not install it; see [docs/CodeGraph-install-guide.md](docs/CodeGraph-install-guide.md)) |

> CodeGraph is an optional accelerator: it pre-builds a dependency graph, cuts knowledge-base scan context by 70–80%, and makes change-impact analysis more precise. Before generating a knowledge base, Placet does a light preflight of file count and CodeGraph status. For large projects it is strongly recommended, but the AI must ask first and only run `codegraph build` after you confirm. Small projects can skip it; if it is not installed, the scan falls back to a slower path.

## Install

```bash
git clone https://github.com/placethk/placet.git
cd placet
bash install.sh --tools    # On Windows run this in Git Bash
```

**Windows note**: `install.sh`, `update-skills.sh`, and `node-detect.sh` need **Git Bash or WSL**.

After a framework upgrade, install new Skills with: `bash update-skills.sh`

## Start

```bash
# Start Claude Code in the project directory
cd D:\my-project
claude

# First use: activate the pipeline (shows the operations menu)
/placet-init

# Later sessions: one-shot restore (auto-activates and shows progress)
/placet-status
```

> `/placet-status` treats the current directory as the target project; you do not need to init again. Use `/placet-init` when switching projects.

---

## How to use

**Talk in natural language**; the AI matches the stage. **Specify the target project path once**; later turns inherit it.

| What you want | What to say |
|-----------|--------|
| Help the AI understand an existing project | `generate knowledge base` (first time, specify the target project) |
| Start a new requirement | `requirements analysis: <feature>` |
| Generate a PRD | `generate PRD` |
| Software design | `software design` or `change strategy` |
| Write code | `implement code` or `start coding` |
| Generate test cases | `test cases` or `regression verification` |
| Run tests and produce a report | `test report` or `run tests` |
| Change an existing requirement | `requirement change: user-login add forgot-password` |
| Update the knowledge base | `update knowledge base` |
| Check project progress | `/placet-status` |

> After each stage the AI waits for confirmation. You can say "generate all remaining docs at once so I can review them together" to skip per-stage confirmation.

Available Skill commands: `/placet-init` `/placet-knowledge-base` `/placet-knowledge-base-update` `/placet-knowledge-fact-gate` `/placet-status` `/placet-context-compress` `/placet-skill-eval` `/placet-env-setup` `/placet-ui-ux` `/placet-now` (Tab completes them).

---

## A full example

```
👤 /placet-init              # First activation in the project directory
🤖 Detected current directory D:\my-app. Use it as the target project?
👤 Yes

👤 requirements analysis: user login module, phone + password
🤖 Suggested requirement id: user-login → [creates 00-original-requirements.md]
🤖 📊 Grade M (about 8 files, 2 modules). Confirm?

👤 Confirm  →  🤖 Requirements analysis done
👤 generate PRD →  🤖 PRD done
👤 software design →  🤖 Design done
👤 start coding →  🤖 Code + tests done
👤 test report →  🤖 12/12 passed → knowledge base updated 🎉
```

---

## Project knowledge base (important)

**When connecting an existing project, say this first**:

```
generate knowledge base
```

The AI scans the project and generates an architecture overview, module dictionary, and coding conventions. Later stages reuse that automatically — **generate once, reuse for the whole pipeline**. After code changes, say `update knowledge base` for an incremental sync.

---

## Change grades

The AI estimates the scale of each requirement and adapts the flow:

| Grade | Files | Flow |
|------|:---:|------|
| **S** | ≤3 | Brief analysis → direct change → brief report |
| **M** | 4-15 | Full 6 stages: analysis → PRD → design → TDD coding → test cases → test report |
| **L** | >15 | Strategy doc → batched execution → regression |

If you do not specify a grade, the AI evaluates and asks you to confirm. You can also say `level: M`.

---

## Directory layout (isolated per requirement)

```
target-project/
├── docs/
│   ├── knowledge-base/           # Project knowledge base (shared)
│   ├── user-login/               # Requirement A (its own directory)
│   │   ├── 00-original-requirements.md
│   │   ├── 01-requirements-analysis.md
│   │   ├── 02-prd.md
│   │   ├── 03-software-design.md
│   │   ├── 04-test-cases.md
│   │   ├── 05-test-report.md
│   │   └── CHANGELOG.md
│   └── another-feature/          # Requirement B (does not interfere)
└── tests/{requirement-id}/       # Test code
```

---

## FAQ

**Q: Do I have to walk every stage in order?**
A: No. You can say "skip design, go straight to coding" or "generate analysis and PRD together so I can review both".

**Q: What if requirements change mid-stream?**
A: Say `requirement change: xxx`. The AI analyzes impact and only redoes the affected parts; you do not start over.

**Q: How do I resume in a new session?**
A: `/placet-status <target-project-path>`. The AI scans existing outputs and tells you the progress.

**Q: Do I rebuild the knowledge base every time?**
A: No. The first scan is full; later `update knowledge base` only updates what changed.

---

> 📖 Product intro [README.md](README.md) | Full process rules [PLACET.md](PLACET.md) | Upgrade guide [UPGRADE.md](UPGRADE.md) | Customization [docs/customization-and-extension.md](docs/customization-and-extension.md)
