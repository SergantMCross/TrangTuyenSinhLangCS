param(
  [string]$DocumentsDir = (Join-Path -Path (Get-Location) -ChildPath "documents"),
  [string]$OutFile = (Join-Path -Path (Join-Path -Path (Get-Location) -ChildPath "documents") -ChildPath "manifest.json")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $DocumentsDir)) {
  throw "Documents folder not found: $DocumentsDir"
}

$items = Get-ChildItem -Path $DocumentsDir -File |
  Where-Object {
    $_.Name.ToLower().EndsWith(".pdf") -or
    $_.Name.ToLower().EndsWith(".docx") -or
    $_.Name.ToLower().EndsWith(".xlsx") -or
    $_.Name.ToLower().EndsWith(".xls")
  } |
  Sort-Object -Property Name |
  ForEach-Object {
    if ($_.Name.ToLower().EndsWith(".pdf")) { $type = "pdf" }
    elseif ($_.Name.ToLower().EndsWith(".docx")) { $type = "docx" }
    else { $type = "excel" }

    # Convert last write time to unix-milliseconds
    $ms = [long](($_.LastWriteTimeUtc - (Get-Date "1970-01-01T00:00:00Z")).TotalMilliseconds)
    [pscustomobject]@{
      name = $_.Name
      type = $type
      sizeBytes = [long]$_.Length
      lastModifiedMs = $ms
    }
  }

$json = $items | ConvertTo-Json -Depth 3
$json | Set-Content -Path $OutFile -Encoding UTF8

Write-Host ("Updated manifest: {0} ({1} files)" -f $OutFile, $items.Count)

