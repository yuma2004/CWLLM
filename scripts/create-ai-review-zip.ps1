param(
  [string]$OutputPath,
  [switch]$ListOnly
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command tar -ErrorAction SilentlyContinue)) {
  throw "tar command not found. Install bsdtar or ensure tar is available in PATH."
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path (Get-Location) ("CWLLMv_ai_review_{0}.zip" -f $timestamp)
}

$outputLeaf = Split-Path $OutputPath -Leaf

$exclude = @(
  ".git",
  ".claude",
  ".cursor",
  ".vscode",
  ".idea",
  "node_modules",
  "*/node_modules",
  "dist",
  "*/dist",
  "build",
  "*/build",
  "coverage",
  "*/coverage",
  "logs",
  "*/logs",
  ".next",
  "*/.next",
  ".turbo",
  "*/.turbo",
  ".cache",
  "*/.cache",
  "test-results",
  "*/test-results",
  "playwright-report",
  "*/playwright-report",
  "out",
  "*/out",
  "tmp",
  "*/tmp",
  "temp",
  "*/temp",
  ".env",
  ".env.*",
  "*/.env",
  "*/.env.*",
  "*.local",
  "*/.local",
  "*.log",
  "*/*.log",
  "*/*/*.log",
  "*/*/*/*.log",
  "CWLLMv_ai_review_*.zip",
  $outputLeaf,
  "./$outputLeaf",
  "cookies.txt",
  "*/cookies.txt"
)

$tarArgs = @()
foreach ($pattern in $exclude) { $tarArgs += @("--exclude", $pattern) }

if ($ListOnly) {
  $tempZip = Join-Path $env:TEMP ("CWLLMv_ai_review_list_{0}.zip" -f $timestamp)
  if (Test-Path $tempZip) { Remove-Item -Force $tempZip }
  & tar -a -cf $tempZip @tarArgs .
  & tar -tf $tempZip | Sort-Object
  Remove-Item -Force $tempZip
  exit 0
}

if (Test-Path $OutputPath) { Remove-Item -Force $OutputPath }

Write-Host ("Creating zip: {0}" -f $OutputPath) -ForegroundColor Cyan
$tempZip = Join-Path $env:TEMP ("CWLLMv_ai_review_build_{0}.zip" -f $timestamp)
if (Test-Path $tempZip) { Remove-Item -Force $tempZip }
& tar -a -cf $tempZip @tarArgs .
Move-Item -Force $tempZip $OutputPath

Write-Host "Done." -ForegroundColor Green
