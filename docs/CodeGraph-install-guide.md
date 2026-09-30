# CodeGraph install guide

> CodeGraph is an **optional** accelerator for Placet. Not installing it does not break the pipeline (the knowledge-base Skill falls back to a full scan).
> `install.sh` **does not install** CodeGraph: on Windows, native builds of `better-sqlite3` often fail and leave a broken install.

---

## 1. What it does

- `codegraph build` — pre-builds a dependency graph and cuts knowledge-base scan context by 70–80%
- `codegraph fn-impact <function>` — computes a precise change-impact radius (task 9 change analysis)
- `codegraph dead-code` / `codegraph check` — dead-code detection / CI gate

The knowledge-base Skill runs a light preflight in Phase 0.0 via `preflight-kb.sh`: it reports source-file count, project size, whether the project is large, and CodeGraph status. For large projects, it must ask whether to use CodeGraph; only after you confirm does it run `codegraph build` (success of the build is what counts). After a successful build it uses `.codegraph/`; otherwise it records the fallback reason in the docs.

---

## 2. Prerequisites

| Item | Requirement |
|----|------|
| Node.js | >= 22.12.0 |
| OS | Windows / macOS / Linux |
| Extra on Windows | Visual Studio Build Tools (C++ workload) **or** a network that can download prebuilt binaries |

---

## 3. Install options

### Option A: npm install (simplest, try this first)

```bash
npm install -g @optave/codegraph
codegraph --version
```

**If it prints a version** → install succeeded; skip the rest.

**If it errors** → usually a native `better-sqlite3` compile failure; see options B/C below.

---

### Option B: install Visual Studio Build Tools, then reinstall (Windows compile failure)

On Windows, if `better-sqlite3` cannot download a prebuilt binary, it falls back to a local compile and needs the VS C++ toolchain.

1. Download [Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
2. During install, select the "Desktop development with C++" workload
3. Reinstall CodeGraph:

```bash
npm uninstall -g @optave/codegraph
npm install -g @optave/codegraph
codegraph --version
```

---

### Option C: use the framework helper script (Windows, cleans leftovers)

The framework ships `scripts/fix-codegraph.ps1`, which cleans a broken Roaming shim → uninstalls → reinstalls.

Run in PowerShell (not Git Bash):

```powershell
cd L:\jit\placet
powershell -ExecutionPolicy Bypass -File scripts\fix-codegraph.ps1
```

> The script does not guarantee success. It is still `npm install`, plus cleanup. If it still fails, go back to option B.

---

### Option D: upgrade Node to 22+ (if Node is too old)

If Node < 22.12.0, upgrade first. The framework ships `scripts/upgrade-node-portable.ps1`, which installs from the official ZIP to `D:\nodejs` (no MSI):

```powershell
cd L:\jit\placet
powershell -ExecutionPolicy Bypass -File scripts\upgrade-node-portable.ps1
# or pin a version
powershell -ExecutionPolicy Bypass -File scripts\upgrade-node-portable.ps1 -Version v22.23.1
```

Then retry option A.

---

## 4. Verify it works

```bash
codegraph --version          # should print a version
cd your-project-root
codegraph build              # creates .codegraph/
ls .codegraph/               # should contain output files
```

`codegraph --version` working ≠ `codegraph build` working. In some environments the native `better-sqlite3` binding lets `--version` pass but `build` fails. **Availability is confirmed by `codegraph build`.**

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
|------|------|------|
| `codegraph: command not found` | PATH missing npm prefix | Open a new terminal, or add `npm prefix -g` to PATH |
| `Could not find any Visual Studio installation` | Missing C++ toolchain on Windows | Option B |
| `gyp ERR! configure error` | Same as above | Option B |
| `--version` works but `build` errors | Native binding is broken | `npm rebuild better-sqlite3` or option C |
| `npm ls -g` shows it but CLI is missing | Leftover Roaming shim | Option C |

---

## 6. Uninstall

```bash
npm uninstall -g @optave/codegraph
# Clean leftover Windows shims
rm -f "$(npm prefix -g)/codegraph" "$(npm prefix -g)/codegraph.cmd"
rm -rf "$APPDATA/npm/node_modules/@optave/codegraph"
```

Uninstalling does not affect the Placet pipeline; the knowledge-base Skill falls back to a full scan.

---

## 7. Why install.sh does not auto-install CodeGraph

Older `install.sh` versions tried to install CodeGraph automatically. Problems:

1. On Windows, `better-sqlite3` compile failures are common and leave a broken install
2. User environments vary (Node version, VS, network), so a single path is hard
3. CodeGraph is **optional**; `install.sh` should not abort because of it

**Decision**: `install.sh` only detects, it does not install. Users follow this guide. The three helper scripts (`node-detect.sh` / `fix-codegraph.ps1` / `upgrade-node-portable.ps1`) stay as **opt-in helpers when the user wants to install**, and are not called from the main flow.
