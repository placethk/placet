# Placet Upgrade Guide

> After every `git pull` of the latest code, update local Skills with the steps below.
> Run these commands in **Git Bash** (included when you install Git for Windows).

---

## Automatic update (recommended)

After pulling the latest code, run this from the repo root:

```bash
bash update-skills.sh
```

What the script does:
- **Backs up then deletes** managed Placet Skills under `~/.claude/skills/placet-*`, plus leftover names this product used to install (`jit-placet-init`, `jit-project-placet-status`, …)
- **Does not** delete unrelated Skills, including original DevPilot `jit-devpilot-*` installs
- **Reinstalls** every current `placet-*` Skill from this repo's `skills/` directory

Restart Claude Code for the change to take effect (`/exit` → `claude`).

---

## Verify

```bash
# Git Bash
ls "$HOME/.claude/skills/" | grep '^placet-'
```

You should see these Skills:

- `placet-init`
- `placet-knowledge-base`
- `placet-knowledge-base-update`
- `placet-knowledge-fact-gate`
- `placet-status`
- `placet-context-compress`
- `placet-skill-eval`
- `placet-env-setup`
- `placet-ui-ux`
- `placet-now`
