param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$BackupPath
)

if (-not $DatabaseUrl) {
  Write-Error 'DATABASE_URL is required.'
  exit 1
}

if (-not $BackupPath) {
  Write-Error 'BackupPath is required.'
  exit 1
}

if (-not (Test-Path $BackupPath)) {
  Write-Error "Backup file not found: $BackupPath"
  exit 1
}

Write-Host "Restoring database from $BackupPath"
pg_restore --clean --if-exists -d $DatabaseUrl $BackupPath

if ($LASTEXITCODE -ne 0) {
  Write-Error 'Restore failed.'
  exit $LASTEXITCODE
}

Write-Host 'Restore completed.'
