# Placet

**A spec-driven AI development pipeline for Claude Code**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill%20%2B%20Agent-1f6feb)](https://github.com/placethk/placet)
[![Version](https://img.shields.io/badge/version-1.0.0-informational)](VERSION)

Spec-driven AI development pipeline for Claude Code: one sentence in, requirements → PRD → design → TDD → tests → knowledge base out. Every stage waits for human confirmation.

Drive the full R&D flow with one sentence: requirements analysis → PRD → software design → TDD coding → test cases → test report → knowledge-base update. Each stage waits for human confirmation before the next one starts.

Repository: [github.com/placethk/placet](https://github.com/placethk/placet)

---

## What it solves

Asking AI to write code directly often means requirements never align, design is not traceable, and nobody knows what a change actually affected. Placet turns R&D into a **recoverable, graded, archivable** pipeline:

| Capability | Description |
|------|------|
| Spec-driven | Each requirement gets its own directory: `00` original requirements → `01` analysis → `02` PRD → `03` design → `04` test cases → `05` report |
| Human gates | A stage must be confirmed before the next one starts; the AI must not skip stages on its own |
| S / M / L grading | Small changes go straight to code; medium changes follow the full flow; large changes add a change strategy and a regression checklist |
| Project knowledge base | Understand existing code first, then develop; later stages reuse the knowledge base instead of rescanning the whole repo |
| Target-project isolation | The framework directory holds only the pipeline; outputs go to your product project's `docs/` and `tests/` |

---

## 30-second start

```bash
git clone https://github.com/placethk/placet.git
cd placet
bash install.sh --tools    # On Windows use Git Bash or WSL
```

Then start Claude Code in the **target project** directory:

```text
/placet-init
requirement: I need a user login module
```

The AI suggests an English requirement id (for example `user-login`). After you confirm, it creates `docs/user-login/00-original-requirements.md`, then evaluates S/M/L and continues.

Full commands and FAQ: [QUICKSTART.md](QUICKSTART.md).

---

## Pipeline

```text
Activate Placet
    ↓
Generate knowledge base (recommended first for existing projects)
    ↓
Requirements analysis  →  confirm grade S / M / L
    ↓
PRD (skipped for S)
    ↓
Software design (skipped for S; L also produces a change strategy)
    ↓
Code implementation (M/L use TDD)
    ↓
Test cases (skipped for S)
    ↓
Test report
    ↓
Incremental knowledge-base update
```

If requirements change mid-stream, say `requirement change: user-login add forgot-password`. The AI only redoes affected stages; unaffected docs and code stay as they are.

| What you want | What to say |
|-----------|--------|
| Help the AI understand an existing project | `generate knowledge base` (first time, specify the target project) |
| Start a new requirement | `requirements analysis: <feature>` |
| Generate a PRD | `generate PRD` |
| Software design | `software design` |
| Write code | `implement code` |
| Generate test cases | `test cases` |
| Run tests and produce a report | `test report` |
| Change an existing requirement | `requirement change: <id> <description>` |
| Check progress | `/placet-status` |

---

## Change grading

If you do not specify a grade, the AI evaluates during requirements analysis and asks you to confirm.

| Grade | Scale | Flow |
|:----:|------|------|
| **S** | ≤3 files | Brief analysis → direct change → brief test report → knowledge-base update |
| **M** | 4–15 files or 2–3 modules | Full stages: analysis → PRD → design → TDD → test cases → report → knowledge base |
| **L** | >15 files or cross-module | Full stages + batched change strategy + regression checklist |

---

## Target-project outputs

```text
your-product-project/
├── docs/
│   ├── knowledge-base/          # Project knowledge base (shared, incremental)
│   └── user-login/              # One requirement (does not overwrite others)
│       ├── 00-original-requirements.md
│       ├── 01-requirements-analysis.md
│       ├── 02-prd.md
│       ├── 03-software-design.md
│       ├── 04-test-cases.md
│       ├── 05-test-report.md
│       └── CHANGELOG.md
└── tests/user-login/            # Unit tests for this requirement
```

---

## How to read the docs

| File | Audience | Role |
|------|------|------|
| [README.md](README.md) | Humans / GitHub | This file: product intro and install |
| [QUICKSTART.md](QUICKSTART.md) | Humans | 30-second start, common phrases, FAQ |
| [PLACET.md](PLACET.md) | AI / maintainers | **Pipeline process source of truth** (stages, outputs, quality bar) |
| [CLAUDE.md](CLAUDE.md) | AI | Behavioral rules, gates, trigger keywords |
| [docs/PLACET_CLAUDE_CODE_GUIDE.md](docs/PLACET_CLAUDE_CODE_GUIDE.md) | AI | Agent delegation protocol |
| [docs/customization-and-extension.md](docs/customization-and-extension.md) | Maintainers | How to change the flow, add Skills, add Agents |
| [UPGRADE.md](UPGRADE.md) | Maintainers | Framework upgrades |
| [CHANGELOG.md](CHANGELOG.md) | Humans | Released versions |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors | How to change Skills and open a PR |
| [docs/github-repo-settings.md](docs/github-repo-settings.md) | Maintainers | GitHub About / Topics notes |

> The root `README.md` used to be both the product intro and the AI rulebook, which meant GitHub visitors saw a 1000+ line internal spec. They are now split: `README.md` is for humans, `PLACET.md` is for Agents.

---

## Requirements

| Dependency | Version | Notes |
|------|------|------|
| Node.js | >= 18 | `node -v` |
| git | any | `git --version` |
| Claude Code | latest | `npm install -g @anthropic-ai/claude-code` |
| CodeGraph | optional, Node >= 22.12.0 | Speeds up large-project knowledge-base scans; see the [install guide](docs/CodeGraph-install-guide.md) |

On Windows, `install.sh` / `update-skills.sh` need **Git Bash or WSL**. After a framework upgrade, run `bash update-skills.sh` to install new Skills.

---

## License

This project is licensed under the [MIT License](LICENSE).

Some capabilities are based on and integrate [claude-code-collective](https://github.com/claude-code-collective/claude-code-collective); those components follow their original licenses.
