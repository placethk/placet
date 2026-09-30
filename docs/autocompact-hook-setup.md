# Autocompact hook — user-global setup

## Goal

Configure a **UserPromptSubmit** hook under the user-global `~/.claude/` so each user message checks context usage. When usage is over the threshold, prompt the user to run `/compact` before the context window fills and the task stops.

## Background

- **Claude Code built-in auto-compact**: on by default; it usually fires near the limit (often 90%+)
- **This hook is an early warning**: it prompts at about 70% so you do not wait for auto-compact
- **Auto-compact can drop detail**: a manual `/compact` earlier is more controllable
- **Scope**: user-global `~/.claude/`; it applies to every project, including non-Placet sessions

## Why not a Stop hook?

A `Stop` hook only runs when the **session ends** (Ctrl+C / `/stop` / quitting Claude Code), not at the end of each turn. That cannot warn you mid-task.

**`UserPromptSubmit`** runs when the user submits a message — right before the next step. The user can `/compact` first and then continue.

## Where to configure

| OS | Path |
|----|------|
| Windows | `C:\Users\<username>\.claude\` |
| Mac / Linux | `~/.claude/` |

---

## Setup

### Step 1: Create the hooks directory if needed

```bash
# Git Bash / Mac / Linux
mkdir -p ~/.claude/hooks
```

### Step 2: Create the hook script

**Recommended: PowerShell** (native on Windows, no extra dependencies)

Path: `C:\Users\<username>\.claude\hooks\autocompact-check.ps1`

```powershell
# Autocompact Check Hook
# Warn when estimated context usage exceeds the threshold.

$thresholdPercent = 70

function Write-Utf8Line {
    param([string]$Message)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Message + "`n")
    [System.Console]::OpenStandardOutput().Write($bytes, 0, $bytes.Length)
}

try {
    $input | Out-File -FilePath "$env:TEMP\autocompact-input.json" -Encoding utf8
    $hookInput = Get-Content "$env:TEMP\autocompact-input.json" -Encoding utf8 | ConvertFrom-Json
    $transcriptPath = $hookInput.transcript_path
} catch {
    $transcriptPath = $null
}

if (-not $transcriptPath -or -not (Test-Path $transcriptPath)) {
    Write-Utf8Line "autocompact-info: estimate context usage; if over 70%, run /compact"
    exit 0
}

$fileSize = (Get-Item $transcriptPath).Length
$estimatedTokens = [int]($fileSize / 4)
$estimatedPercent = [int]($estimatedTokens * 100 / 200000)

if ($estimatedPercent -ge $thresholdPercent) {
    $fileSizeKb = [math]::Round($fileSize / 1024)
    Write-Utf8Line "autocompact-warn: context usage about ${estimatedPercent}% (transcript ${fileSizeKb}KB, about ${estimatedTokens} tokens)"
    Write-Utf8Line "Run /compact to shrink history before the context window fills and the task stops."
}

exit 0
```

Save the `.ps1` file as **UTF-8 with BOM**. PowerShell 5.x otherwise decodes as the system ANSI code page. After creating the file:

```bash
powershell -Command "& { \$path = '$HOME\.claude\hooks\autocompact-check.ps1'; \$content = [System.IO.File]::ReadAllText(\$path, [System.Text.Encoding]::UTF8); \$utf8WithBom = New-Object System.Text.UTF8Encoding \$true; [System.IO.File]::WriteAllText(\$path, \$content, \$utf8WithBom) }"
```

**Alternative: Bash** (Git Bash; no jq required)

Path: `~/.claude/hooks/autocompact-check.sh`

```bash
#!/bin/bash
THRESHOLD_PERCENT=70

input=$(cat)
transcript_path=$(echo "$input" | sed -n 's/.*"transcript_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
  echo "autocompact-info: estimate context usage; if over 70%, run /compact"
  exit 0
fi

file_size=$(wc -c < "$transcript_path" 2>/dev/null || echo 0)
file_size_kb=$((file_size / 1024))
estimated_tokens=$((file_size / 4))
estimated_percent=$((estimated_tokens * 100 / 200000))

if [ $estimated_percent -ge $THRESHOLD_PERCENT ]; then
  echo "autocompact-warn: context usage about ${estimated_percent}% (transcript ${file_size_kb}KB, about ${estimated_tokens} tokens)"
  echo "Run /compact to shrink history before the context window fills and the task stops."
fi

exit 0
```

### Step 3: Edit `~/.claude/settings.json`

If `~/.claude/settings.json` already has content, **merge** the UserPromptSubmit hook into the existing `hooks` object. Do not overwrite the whole file.

**PowerShell command:**

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -ExecutionPolicy Bypass -File C:\\Users\\<username>\\.claude\\hooks\\autocompact-check.ps1"
          }
        ]
      }
    ]
  }
}
```

**Bash command:**

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/autocompact-check.sh"
          }
        ]
      }
    ]
  }
}
```

Merge example (keep existing hooks + add UserPromptSubmit):

```json
{
  "hooks": {
    "ExistingHook": [ ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -ExecutionPolicy Bypass -File C:\\Users\\<username>\\.claude\\hooks\\autocompact-check.ps1"
          }
        ]
      }
    ]
  }
}
```

### Step 4: Test

1. Restart Claude Code so `settings.json` is loaded
2. Have a conversation (read files, run tools) so the transcript grows
3. Watch for `autocompact-warn` on later turns
4. When it appears, run `/compact`
5. If usage is still under 70%, temporarily lower the threshold (for example 50%) to confirm the prompt fires

---

## Fields

| Field | Notes |
|-------|-------|
| `transcript_path` | Field in the Claude Code hook input JSON; path to the current session transcript |
| Missing field | Script prints `autocompact-info` and exits 0 |
| Token estimate | Rough `transcript size / 4`; warning only, not exact |

---

## Notes

1. Threshold is `$thresholdPercent = 70` (or `THRESHOLD_PERCENT` in Bash); change to 60/80 as needed
2. PowerShell script has no extra dependencies; Bash uses `sed` (no jq)
3. In Windows JSON paths, escape backslashes as `\\`
4. Hook stdout is visible to Claude; the `autocompact-warn:` prefix makes it easy to spot
5. User-global config is independent of the Placet framework config
6. `.ps1` files need UTF-8 BOM on PowerShell 5.x
7. `settings.json` must be UTF-8 **without** BOM. Node strict JSON rejects a BOM (`Unexpected token`). Strip BOM if present:
   ```bash
   powershell -Command "& { \$path = '$HOME\.claude\settings.json'; \$bytes = [System.IO.File]::ReadAllBytes(\$path); if (\$bytes[0] -eq 0xEF -and \$bytes[1] -eq 0xBB -and \$bytes[2] -eq 0xBF) { [System.IO.File]::WriteAllBytes(\$path, \$bytes[3..(\$bytes.Length-1)]) } }"
   ```

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Hook never runs | Validate JSON: `node -e "JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/settings.json','utf8')); console.log('OK')"` |
| BOM error in settings.json | Node reports `Unexpected token` → strip BOM with the command above |
| `.ps1` parse errors | Add UTF-8 BOM as in Step 2 |
| Garbled `.ps1` output | Use `Write-Utf8Line`, not `Write-Output` |
| Bash JSON parse fails | Confirm `sed` extraction; jq is not required |
| Script error | Smoke test: `echo '{}' | bash ~/.claude/hooks/autocompact-check.sh` |
| No warning | Estimated percent is under the threshold; temporarily set `THRESHOLD_PERCENT=30` |
| Execution policy | The command already uses `-ExecutionPolicy Bypass`. If it still fails: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Empty `transcript_path` | Inspect `%TEMP%\autocompact-input.json` (or `$TMPDIR`) for the real field name |

### Inspect actual hook input

Temporarily dump the JSON at the top of the script:

```powershell
$input | Out-File -FilePath "$HOME\.claude\hooks\last-input.json" -Encoding utf8
```

or

```bash
cat > ~/.claude/hooks/last-input.json
```

Run one turn, then open that file.

---

## Optional follow-ups

### Auto-run `/compact` (experimental)

The default is “tell the user to run `/compact`”. Auto-invoking `/compact` from a hook is less stable and can interrupt normal chat. Use the prompt-only version first.

### More accurate token counts

File-size / 4 is a rough estimate. For exact counts, use a tokenizer (extra dependency). The rough estimate is enough for an early warning.
