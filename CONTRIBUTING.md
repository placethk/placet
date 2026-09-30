# Contributing to Placet

## Setup

```bash
git clone https://github.com/placethk/placet.git
cd placet
bash install.sh --tools    # Git Bash or WSL on Windows
```

Node.js >= 18. After a pull, run `bash update-skills.sh` so `~/.claude/skills/placet-*` matches this repo.

## How the repo is organized

| Path | Role |
|------|------|
| `CLAUDE.md`, `PLACET.md` | Pipeline rules (AI source of truth) |
| `skills/placet-*` | User-facing Skills; directory name must match YAML `name:` |
| `docs/` | Shipped English docs |
| `notes/` | Local scratch — gitignored, do not commit or translate for the product |

Skill names are kebab-case and start with `placet-` (`placet-init`, `placet-status`, …).

## Before you open a PR

1. Keep user-facing text in English.
2. If you add or rename a Skill, update `CLAUDE.md`, `install.sh` / `update-skills.sh`, and `QUICKSTART.md`.
3. Check scripts:

```bash
node --check skills/placet-status/scripts/scan-status.js
node skills/placet-skill-eval/scripts/eval-skill.js placet-status --collect
```

4. Do not commit `notes/`, `.codegraph/`, `node_modules/`, or `.claude/settings.local.json`.

## Issues

Use the Bug / Feature templates. Include OS, `VERSION`, and the Skill or command you ran.
