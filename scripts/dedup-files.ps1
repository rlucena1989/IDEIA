param(
  [switch]$DryRun,
  [string]$Path = "."
)

$corruptedFiles = @(
  "packages/schema-registry/src/cli-schema.ts",
  "packages/slo-monitor/src/cli-slo.ts",
  "packages/auto-adr/src/adr-cli.ts",
  "packages/agent-graph/src/dag-executor.ts",
  "packages/self-chat-protocol/src/knowledge-indexer.ts",
  "packages/ai-engineer/src/ai-engineer.ts",
  "packages/autonomous-evolution-engine/src/optimization-applier.ts",
  "packages/config-engine/src/config-history.ts",
  "packages/initiative-feedback/src/feedback-store.ts",
  "packages/policy-engine/src/cli-team.ts",
  "packages/autonomous-evolution-engine/src/evolution-daemon.ts",
  "packages/metrics-store/src/pruner.ts",
  "packages/cli/src/commands/graph.ts",
  "packages/cli/src/commands/chat.ts",
  "packages/cli/src/commands/diagnostics.ts",
  "packages/cli/src/commands/security.ts",
  "packages/cli/src/websocket/ws-broadcast.ts",
  "packages/cli/src/blueprint-generator/contract-generator.ts"
)

$totalSaved = 0
$totalFixed = 0

foreach ($relPath in $corruptedFiles) {
  $fullPath = Join-Path $Path $relPath
  if (-not (Test-Path $fullPath)) {
    Write-Host "SKIP $relPath (not found)"
    continue
  }

  $content = Get-Content -Path $fullPath -Raw
  if (-not $content) {
    Write-Host "EMPTY $relPath"
    continue
  }

  $lines = $content -split '\r?\n'
  $totalLines = $lines.Count

  # Find LAST occurrence of each unique export (class, function, interface, type, const)
  $exportMatches = Select-String -Pattern "^export (class|function|interface|type|const) (\w+)" -Path $fullPath
  $lastExports = @{}
  foreach ($m in $exportMatches) {
    $name = $m.Matches[0].Groups[2].Value
    $lastExports[$name] = $m.LineNumber
  }

  # Find the LATEST start position among all export re-definitions
  $secondOccurrence = -1
  $seen = @{}
  foreach ($m in $exportMatches) {
    $name = $m.Matches[0].Groups[2].Value
    if ($seen.ContainsKey($name)) {
      # This is a re-definition - the split should be HERE
      # But we want the LAST copy, so we track the LATEST re-definition
      $secondOccurrence = $m.LineNumber
    }
    $seen[$name] = $true
  }

  if ($secondOccurrence -gt 0) {
    # We found ALL duplicates. The LAST copy starts at the LAST second occurrence
    # Actually, we want to keep content from secondOccurrence to END
    # Wait, secondOccurrence points to where the LAST re-definition starts
    # Since all copies are identical, we need to find where the SECOND-TO-LAST copy ENDS
    # and keep from there to the end
    
    # The split point should be: find where the FIRST export appears again
    # and keep everything from that point
    # Actually the SIMPLEST: keeping from the SECOND occurrence of the FIRST export to end
    
    $firstExportLine = $exportMatches[0].Line
    $firstExportName = $exportMatches[0].Matches[0].Groups[2].Value
    $secondCopyStart = -1
    for ($i = 1; $i -lt $exportMatches.Count; $i++) {
      $name = $exportMatches[$i].Matches[0].Groups[2].Value
      if ($name -eq $firstExportName) {
        $secondCopyStart = $exportMatches[$i].LineNumber
        break
      }
    }
    
    if ($secondCopyStart -gt 0) {
      # Keep from secondCopyStart to end
      $deduped = $lines[($secondCopyStart - 1)..($totalLines - 1)]
      # Remove empty first lines
      while ($deduped.Count -gt 0 -and $deduped[0] -match '^\s*$') {
        $deduped = $deduped[1..($deduped.Count - 1)]
      }
      $savedLines = $totalLines - $deduped.Count
      if (-not $DryRun) {
        $deduped -join "`r`n" | Set-Content -Path $fullPath -Force
      }
      Write-Host "FIX  $relPath ($totalLines -> $($deduped.Count) lines, saved $savedLines) [kept last copy]"
      $totalSaved += $savedLines
      $totalFixed++
      continue
    }
  }

  # Try strategy 2: files with different export names per block
  # Find midpoint by matching duplicate import blocks
  $importLines = New-Object System.Collections.ArrayList
  for ($i = 0; $i -lt $totalLines; $i++) {
    if ($lines[$i] -match '^import ') {
      $null = $importLines.Add($i)
    }
  }

  if ($importLines.Count -gt 7) {
    $firstImportText = $lines[$importLines[0]]
    $secondImportBlock = -1
    for ($i = 1; $i -lt $importLines.Count; $i++) {
      if ($lines[$importLines[$i]] -eq $firstImportText) {
        $secondImportBlock = $importLines[$i]
        break
      }
    }
    if ($secondImportBlock -gt 0) {
      # Keep from secondImportBlock to end
      $deduped = $lines[$secondImportBlock..($totalLines - 1)]
      while ($deduped.Count -gt 0 -and $deduped[0] -match '^\s*$') {
        $deduped = $deduped[1..($deduped.Count - 1)]
      }
      $savedLines = $totalLines - $deduped.Count
      if (-not $DryRun) {
        $deduped -join "`r`n" | Set-Content -Path $fullPath -Force
      }
      Write-Host "FIX  $relPath ($totalLines -> $($deduped.Count) lines, saved $savedLines) [kept last block]"
      $totalSaved += $savedLines
      $totalFixed++
      continue
    }
  }

  Write-Host "SKIP $relPath ($totalLines lines) - could not find split point"
}

Write-Host ""
Write-Host "SUMMARY: $totalFixed files fixed, $totalSaved lines saved"
if ($DryRun) {
  Write-Host "(dry run - no files modified)"
}
