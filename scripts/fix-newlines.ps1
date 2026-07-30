param([string]$Path = ".")

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
  "packages/cli/src/websocket/ws-broadcast.ts"
)

foreach ($relPath in $corruptedFiles) {
  $fullPath = Join-Path $Path $relPath
  if (-not (Test-Path $fullPath)) {
    Write-Host "SKIP $relPath (not found)"
    continue
  }

  $raw = Get-Content -Path $fullPath -Raw

  # Add newlines after semicolons followed by non-whitespace
  # This ensures each import/statement is on its own line
  $text = $raw -replace ';(?!\s*\r?\n)(?!$)', ";`r`n"

  # Add newlines after closing braces of blocks:  }X  where X is not space/newline/EOFs
  $text = $text -replace '\}(?!\s*\r?\n)(?!\s*$)(?!\s*\))', "}`r`n"

  # Add newlines before opening braces of classes/functions
  $text = $text -replace '\{', "`r`n{`r`n"

  # Add newlines between closing/opening braces
  $text = $text -replace '\}\s*\{', "}`r`n{"

  # Split into lines
  $resultLines = $text -split '\r?\n'
  # Remove leading/trailing whitespace from each line
  $resultLines = $resultLines | ForEach-Object { $_.TrimStart() }
  # Remove empty lines
  $resultLines = $resultLines | Where-Object { $_ -ne '' }

  # Write back with proper newlines
  $resultLines -join "`r`n" | Set-Content -Path $fullPath -Force

  Write-Host "FIX  $relPath ($($resultLines.Count) lines)"
}

Write-Host ""
Write-Host "Done."
