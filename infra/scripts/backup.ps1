param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$OutputPath = $(Join-Path (Get-Location) ("backup_{0}.dump" -f (Get-Date -Format 'yyyyMMdd_HHmmss')))
)

if (-not $DatabaseUrl) {
  Write-Error 'DATABASE_URL is required.'
  exit 1
}

Write-Host "Backing up database to $OutputPath"
pg_dump $DatabaseUrl -Fc -f $OutputPath

if ($LASTEXITCODE -ne 0) {
  Write-Error 'Backup failed.'
  exit $LASTEXITCODE
}

Write-Host 'Backup completed.'
