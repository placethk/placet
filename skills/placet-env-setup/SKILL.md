---
name: placet-env-setup
description: Auto-configure Node.js environment variables and tool paths. Detect installed node_modules, Python packages, and other common tools so you do not have to confirm tool locations in every conversation.
---

# Env Auto Setup

Detect and configure environment variables at the start of a conversation, especially Node.js tool paths, so each conversation does not need a manual confirm of tool install status.

---

## Trigger

Run this Skill for environment detection and configuration before any task that needs to execute scripts or tools.

Natural language: `environment setup` / `auto environment setup` / `environment detect`

Command: `/placet-env-setup`

---

## Execution

### Phase 1 - Node.js environment detection

**Automatically run these checks:**

1. **Detect Node.js version** (use `node -p process.versions.node` to avoid Windows CRLF parse issues)
   ```bash
   node -p "process.versions.node"
   ```

2. **Detect CodeGraph** (speeds knowledge-base / change-impact analysis)
   ```bash
   source "$FRAMEWORK/scripts/node-detect.sh"
   node_detect_init
   codegraph_installed          # only means CLI --version works
   codegraph_build_works "<target-project-path>"  # actually confirms build works
   ```
   - `codegraph_build_works` succeeds → print `✅ CodeGraph: build available`; knowledge-base tasks still MUST go through `preflight-kb.sh` first; for large projects, build only after user confirmation, then prefer reading `.codegraph/`
   - Only `codegraph --version` works but `build` fails → print `⚠️ CodeGraph: CLI available but build failed`, follow the large-project degrade strategy
   - `npm ls -g @optave/codegraph` has a record but CLI fails → leftover install; need `npm uninstall -g @optave/codegraph` then reinstall (requires Node >= 22.12.0; on Windows see docs/CodeGraph-install-guide.md)

3. **Detect preinstalled node_modules path**
   - Check: `$HOME/.claude/tools/node-libs/node_modules`
   - Confirm whether common libraries such as docx, mammoth, xlsx, pdf-parse, officeparser are installed
   - If the path does not exist, tell the user to run `bash install.sh --tools` to install the base toolkit

4. **Set NODE_PATH**
   ```bash
   export NODE_PATH="$HOME/.claude/tools/node-libs/node_modules"
   ```

### Phase 2 - Other common tools

1. **Python environment**
   - Detect Python version: `python --version` or `python3 --version`
   - Detect pip-installed packages

2. **Other tool detection**
   - git version
   - Other CLI tools that may be needed

### Phase 3 - Confirm environment configuration

After detection, print an environment summary:

```
✅ Environment detection complete:
- Node.js: v20.20.0
- CodeGraph: build available / CLI available but build failed / not installed
- NODE_PATH: $HOME/.claude/tools/node-libs/node_modules
- Available libraries: docx, mammoth, xlsx, officeparser, etc.
- Node.js scripts can be run directly; no need to reinstall dependencies
```

---

## How to use

In a conversation that needs to run scripts, call this Skill first for environment setup, then continue with later tasks.

**Note**: Environment variable settings are valid only in the current Bash session. Each new tool invocation needs them set again, or prefix the command with the variables.

---

## Recommended execution

When running Node.js scripts, use this form:

```bash
NODE_PATH=$HOME/.claude/tools/node-libs/node_modules node your_script.js
```

---

## Outputs

| Output | Notes |
|------|------|
| Environment detection report | Detected Node.js version, npm, installed-tool list (human-readable text) |
| Environment variable settings | `NODE_PATH` / `PATH` available for this session (current Bash session only) |
| Tool path record | Detected paths for node_modules, Python packages, and other tools |

Writes no persistent files; environment configuration applies to the current session only.
