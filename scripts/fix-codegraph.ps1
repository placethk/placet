#Requires -Version 5.1
<#
.SYNOPSIS
  Repair / install CodeGraph (no MSI; works with npm prefix=D:\nodejs)

  Usage (PowerShell 5.1; do not join the two commands with &&):
    powershell -ExecutionPolicy Bypass -File scripts\fix-codegraph.ps1
#>
$ErrorActionPreference = "Stop"

function Find-NodeExe {
    $candidates = @(
        "D:\nodejs\node.exe",
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    $w = (& where.exe node 2>$null | Select-Object -First 1)
    if ($w -and (Test-Path $w)) { return $w }
    throw "node.exe not found. Run scripts\upgrade-node-portable.ps1 first"
}

function Invoke-NpmQuiet {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    $old = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $script:npmCmd @Args 2>&1 | ForEach-Object { Write-Host $_ }
    $exit = $LASTEXITCODE
    $ErrorActionPreference = $old
    if ($exit -ne 0) { throw "npm failed (exit $exit): $($Args -join ' ')" }
}

$nodeExe = Find-NodeExe
$nodeDir = Split-Path $nodeExe -Parent
$script:npmCmd = Join-Path $nodeDir "npm.cmd"
if (-not (Test-Path $script:npmCmd)) { throw "npm.cmd not found: $script:npmCmd" }

$env:PATH = "$nodeDir;$env:PATH"

Write-Host "Node: $(& $nodeExe -v)"
Write-Host "npm prefix: $(& $script:npmCmd prefix -g)"

$minVersion = "22.12.0"
$semver = & $nodeExe -p "process.versions.node"
$parts = $semver.Split(".") | ForEach-Object { [int]$_ }
$ok = ($parts[0] -gt 22) -or ($parts[0] -eq 22 -and $parts[1] -ge 12)
if (-not $ok) {
    Write-Host "Warning: CodeGraph needs Node >= $minVersion, current v$semver"
}

# Clean broken global shims under Roaming (PATH often includes Roaming\npm; missing cli.js fails forever)
$roaming = Join-Path $env:APPDATA "npm"
$broken = Join-Path $roaming "node_modules\@optave\codegraph"
if (Test-Path $roaming) {
    $cliBroken = Join-Path $broken "dist\cli.js"
    if ((Test-Path $broken) -and -not (Test-Path $cliBroken)) {
        Write-Host "Cleaning broken Roaming install: $broken"
        Remove-Item (Join-Path $roaming "codegraph*") -Force -ErrorAction SilentlyContinue
        Remove-Item $broken -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Uninstalling old @optave/codegraph ..."
Invoke-NpmQuiet uninstall -g @optave/codegraph

Write-Host "Installing @optave/codegraph ..."
Invoke-NpmQuiet install -g @optave/codegraph

$cg = Join-Path $nodeDir "codegraph.cmd"
if (-not (Test-Path $cg)) {
    $cg = (& where.exe codegraph.cmd 2>$null | Select-Object -First 1)
}
if (-not $cg -or -not (Test-Path $cg)) { throw "codegraph.cmd not found" }

$cli = Join-Path $nodeDir "node_modules\@optave\codegraph\dist\cli.js"
if (-not (Test-Path $cli)) { throw "cli.js missing: $cli" }

$ver = & $cg --version 2>&1
Write-Host "CodeGraph: $ver"
Write-Host ""
Write-Host "Done. Open a new terminal and run: codegraph --version"
