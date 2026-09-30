#Requires -Version 5.1
<#
.SYNOPSIS
  Install or upgrade Node.js to D:\nodejs from the official ZIP (no MSI)

  Usage:
    powershell -ExecutionPolicy Bypass -File scripts\upgrade-node-portable.ps1
    powershell -ExecutionPolicy Bypass -File scripts\upgrade-node-portable.ps1 -Version v22.23.1
#>
param(
    [string]$Version = "v22.23.1",
    [string]$TargetDir = "D:\nodejs"
)

$ErrorActionPreference = "Stop"
$zipName = "node-$Version-win-x64.zip"
$url = "https://nodejs.org/dist/$Version/$zipName"
$tmpZip = Join-Path $env:TEMP $zipName
$extractRoot = Join-Path $env:TEMP "node-$Version-win-x64"

Write-Host "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $tmpZip -UseBasicParsing
Write-Host "Extracting to $TargetDir ..."

if (Test-Path $extractRoot) { Remove-Item $extractRoot -Recurse -Force }
Expand-Archive -Path $tmpZip -DestinationPath $env:TEMP -Force

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}
Get-ChildItem $TargetDir -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$extractRoot\*" -Destination $TargetDir -Recurse -Force

$nodeExe = Join-Path $TargetDir "node.exe"
Write-Host "Node: $(& $nodeExe -v)"
Write-Host "npm:  $(& (Join-Path $TargetDir 'npm.cmd') -v)"
Write-Host ""
Write-Host "Confirm system PATH includes: $TargetDir"
Write-Host "Then run: powershell -ExecutionPolicy Bypass -File scripts\fix-codegraph.ps1"
