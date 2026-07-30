param([string]$Path = ".")

$files = @(
  @{src=".stryker-tmp/sandbox-JQ8nWB/packages/self-chat-protocol/src/knowledge-indexer.ts"; dst="packages/self-chat-protocol/src/knowledge-indexer.ts"; firstExport="export class KnowledgeIndexer"}
  @{src=".stryker-tmp/sandbox-JQ8nWB/packages/config-engine/src/config-history.ts"; dst="packages/config-engine/src/config-history.ts"; firstExport="export interface ConfigVersion"}
  @{src=".stryker-tmp/sandbox-JQ8nWB/packages/initiative-feedback/src/feedback-store.ts"; dst="packages/initiative-feedback/src/feedback-store.ts"; firstExport="export interface FeedbackStoreData"}
)

$totalSaved = 0

foreach ($f in $files) {
  $srcPath = Join-Path $Path $f.src
  $dstPath = Join-Path $Path $f.dst
  $firstExportPattern = $f.firstExport

  if (-not (Test-Path $srcPath)) {
    Write-Host "SKIP src not found: $($f.src)"
    continue
  }

  $lines = Get-Content -Path $srcPath
  $totalLines = $lines.Count

  # Find LAST occurrence of first export
  $lastLine = -1
  for ($i = $totalLines - 1; $i -ge 0; $i--) {
    if ($lines[$i] -match [regex]::Escape($firstExportPattern)) {
      $lastLine = $i
      break
    }
  }

  if ($lastLine -eq -1) {
    Write-Host "FAIL $($f.dst): could not find '$firstExportPattern'"
    continue
  }

  # Keep from lastLine to end
  $deduped = $lines[$lastLine..($totalLines - 1)]

  # Remove trailing empty lines
  while ($deduped.Count -gt 0 -and $deduped[-1] -match '^\s*$') {
    $deduped = $deduped[0..($deduped.Count - 2)]
  }

  $deduped -join "`r`n" | Set-Content -Path $dstPath -Force

  $savedLines = $totalLines - $deduped.Count
  $totalSaved += $savedLines
  Write-Host "FIX  $($f.dst): $totalLines -> $($deduped.Count) lines (kept last copy, saved $savedLines)"
}

Write-Host "Total saved: $totalSaved lines"
