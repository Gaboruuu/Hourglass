<#
  Daily event sync, started by Windows Task Scheduler (several times a day as a backup).

  The scraped site blocks GitHub's servers, so the sync runs from this laptop instead.
  - Runs `node sync.js` from EventsSync/ (the API key comes from EventsSync/.env).
  - Output goes to EventsSync/logs/sync-YYYY-MM-DD.log (gitignored); logs older than 30 days are deleted.
  - After a successful run, later runs on the same day are skipped (logs/last-success.txt).
    A failed run (site blocked, backend down, …) is retried by the next scheduled run.
  - The latest sync-report.md, invalid-events.json and sync-errors.md stay in EventsSync/.

  Manual use:
    powershell -ExecutionPolicy Bypass -File scripts\run-daily-sync.ps1            # like the scheduled task
    powershell -ExecutionPolicy Bypass -File scripts\run-daily-sync.ps1 -Force     # run even if today already succeeded
    powershell -ExecutionPolicy Bypass -File scripts\run-daily-sync.ps1 -DryRun    # check everything, write nothing (implies -Force)
#>
param(
  [switch]$Force,
  [switch]$DryRun
)

$syncDir = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $syncDir "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$today = Get-Date -Format "yyyy-MM-dd"
$log = Join-Path $logDir "sync-$today.log"
$marker = Join-Path $logDir "last-success.txt"

function Write-Log([string]$line) {
  Add-Content -Path $log -Value "$(Get-Date -Format 'HH:mm:ss') $line" -Encoding UTF8
}

if (-not $Force -and -not $DryRun -and (Test-Path $marker)) {
  $last = (Get-Content -Path $marker -Raw).Trim()
  if ($last -eq $today) {
    Write-Log "Already synced today, skipping."
    exit 0
  }
}

# Task Scheduler may start with a shorter PATH than a terminal
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = Join-Path $env:ProgramFiles "nodejs\node.exe" }
if (-not (Test-Path $node)) {
  Write-Log "node.exe not found (looked on PATH and in $node)."
  exit 1
}

$syncArgs = if ($DryRun) { "sync.js --dry-run" } else { "sync.js" }
Write-Log "=== Sync started ($syncArgs) ==="

# cmd handles the redirect: in Windows PowerShell 5.1, redirecting a native program's stderr
# turns every line into an error record
Push-Location $syncDir
try {
  & cmd.exe /c "`"$node`" $syncArgs >> `"$log`" 2>&1"
  $code = $LASTEXITCODE
} finally {
  Pop-Location
}

if ($code -eq 0) {
  if (-not $DryRun) { Set-Content -Path $marker -Value $today -Encoding ASCII }
  Write-Log "=== Sync finished OK ==="
} else {
  Write-Log "=== Sync FAILED (exit code $code): see sync-errors.md and the lines above ==="
}

Get-ChildItem -Path $logDir -Filter "sync-*.log" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Remove-Item -Force -ErrorAction SilentlyContinue

exit $code
