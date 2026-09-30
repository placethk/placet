#Requires -Version 5.1
<#
.SYNOPSIS
  Placet knowledge-base preflight (PowerShell wrapper)

.DESCRIPTION
  Cross-platform logic lives in preflight-kb.js. This script does not require Git Bash.
  Default is a lightweight probe; it does not run codegraph build. For large projects,
  first show SOURCE_FILE_COUNT / IS_LARGE_PROJECT / CODEGRAPH_STATUS / RECOMMENDED_ACTION.

.PARAMETER ProjectRoot
  Absolute path to the target project root

.PARAMETER Build
  Run codegraph build after user confirmation

.PARAMETER Rebuild
  Force a fresh codegraph build

.PARAMETER Json
  Emit JSON
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ProjectRoot,

    [switch]$Build,
    [switch]$Rebuild,
    [switch]$Json
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeScript = Join-Path $ScriptDir "preflight-kb.js"

if (-not (Test-Path $NodeScript)) {
    Write-Output "PREFLIGHT_STATUS=ERROR"
    Write-Output "MESSAGE=preflight-kb.js not found at $NodeScript"
    exit 2
}

$node = $null
try {
    $node = (& where.exe node 2>$null | Select-Object -First 1)
} catch {
    # where.exe may write to stderr when node is not on PATH
}

if (-not $node) {
    Write-Output "PREFLIGHT_STATUS=ERROR"
    Write-Output "MESSAGE=node not found. Please install Node.js or run /placet-env-setup."
    exit 2
}

$argsList = @($NodeScript, $ProjectRoot)
if ($Build) { $argsList += "--build" }
if ($Rebuild) { $argsList += "--rebuild" }
if ($Json) { $argsList += "--json" }

& $node @argsList
exit $LASTEXITCODE
