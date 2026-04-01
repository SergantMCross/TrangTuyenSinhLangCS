param(
  [string]$DocumentsDir = (Join-Path -Path (Get-Location) -ChildPath "documents"),
  [string]$OutFile = (Join-Path -Path (Join-Path -Path (Get-Location) -ChildPath "documents") -ChildPath "manifest.json")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $DocumentsDir)) {
  throw "Documents folder not found: $DocumentsDir"
}

# Initial generation
& (Join-Path -Path (Get-Location) -ChildPath "generate-documents-manifest.ps1") -DocumentsDir $DocumentsDir -OutFile $OutFile

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $DocumentsDir
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

# Basic debounce to avoid multiple regenerations during a bulk copy
$script:lastRun = Get-Date
$script:pending = $false
$debounceMs = 800

function Invoke-Regenerate {
  $script:pending = $true
  $script:lastRun = Get-Date
}

$action = {
  # On add/change/rename, regenerate manifest (debounced)
  Invoke-Regenerate
}

Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action | Out-Null

Write-Host "Watching '$DocumentsDir' for .pdf/.docx/.xlsx/.xls changes..."
Write-Host "Leave this PowerShell window running. Press Ctrl+C to stop."

while ($true) {
  Start-Sleep -Milliseconds 250
  if ($script:pending) {
    $elapsed = (Get-Date) - $script:lastRun
    if ($elapsed.TotalMilliseconds -ge $debounceMs) {
      $script:pending = $false
      & (Join-Path -Path (Get-Location) -ChildPath "generate-documents-manifest.ps1") -DocumentsDir $DocumentsDir -OutFile $OutFile
    }
  }
}

