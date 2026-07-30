# Fix all files that import createLogger but don't declare const logger
$files = @(
  "packages/cli/src/commands/adapter.ts",
  "packages/cli/src/commands/audit.ts",
  "packages/cli/src/commands/audit-ledger.ts",
  "packages/cli/src/commands/backup.ts",
  "packages/cli/src/commands/bootstrap.ts",
  "packages/cli/src/commands/consistency.ts",
  "packages/cli/src/commands/coverage.ts",
  "packages/cli/src/commands/coverage-improve.ts",
  "packages/cli/src/commands/docs.ts",
  "packages/cli/src/commands/drift.ts",
  "packages/cli/src/commands/engineer.ts",
  "packages/cli/src/commands/experiment.ts",
  "packages/cli/src/commands/feature.ts",
  "packages/cli/src/commands/gate.ts",
  "packages/cli/src/commands/generate.ts",
  "packages/cli/src/commands/hook.ts",
  "packages/cli/src/commands/ide.ts",
  "packages/cli/src/commands/ideia/agent-command.ts",
  "packages/cli/src/commands/ideia/config-command.ts",
  "packages/cli/src/commands/ideia/deploy-command.ts",
  "packages/cli/src/commands/ideia/idea-command.ts",
  "packages/cli/src/commands/ideia/init-command.ts",
  "packages/cli/src/commands/ideia/memory-command.ts",
  "packages/cli/src/commands/ideia/quality-command.ts",
  "packages/cli/src/commands/ideia/status-command.ts",
  "packages/cli/src/commands/init.ts",
  "packages/cli/src/commands/knowledge.ts",
  "packages/cli/src/commands/low-level.ts",
  "packages/cli/src/commands/mirror.ts",
  "packages/cli/src/commands/multimodal.ts",
  "packages/cli/src/commands/optimize.ts",
  "packages/cli/src/commands/optimize-classify.ts",
  "packages/cli/src/commands/plan.ts",
  "packages/cli/src/commands/polyglot.ts",
  "packages/cli/src/commands/preview.ts",
  "packages/cli/src/commands/prove.ts",
  "packages/cli/src/commands/pr-review.ts",
  "packages/cli/src/commands/rag.ts",
  "packages/cli/src/commands/reality-sync.ts",
  "packages/cli/src/commands/retrospective.ts",
  "packages/cli/src/commands/runtime-hooks.ts",
  "packages/cli/src/commands/scorecard.ts",
  "packages/cli/src/commands/scorecard-display.ts",
  "packages/cli/src/commands/security.ts",
  "packages/cli/src/commands/supply-chain.ts",
  "packages/cli/src/commands/test-autonomy.ts",
  "packages/cli/src/commands/test-fix-broken.ts",
  "packages/cli/src/commands/timeline.ts",
  "packages/cli/src/commands/verify.ts",
  "packages/cli/src/commands/webhook.ts",
  "packages/cli/src/generators/boilerplate-detector.ts",
  "packages/cli/src/generators/mock-api.ts",
  "packages/cli/src/ide/ide-server.ts",
  "packages/cli/src/ideia-bootstrap.ts",
  "packages/cli/src/runtime/plugin-sdk.ts",
  "packages/cli/src/utils/gate/stages.ts",
  "packages/compliance-cli/src/commands.ts",
  "packages/ideia-plugin/src/browser/ideia-title-bar-widget.ts",
  "packages/reality-sync/src/safety-circuit.ts",
  "packages/reality-sync/src/study-scanner.ts"
)

$fixed = 0
$skipped = 0
foreach ($file in $files) {
  $fullPath = Join-Path "F:\PROJETOS\ai-devkit-workspace\IDEIA" $file
  if (-not (Test-Path $fullPath)) { Write-Host "SKIP (not found): $file"; $skipped++; continue }
  
  $content = Get-Content $fullPath -Raw
  if ($content -match 'const logger = createLogger') { Write-Host "SKIP (already has): $file"; $skipped++; continue }
  
  # Extract module name from file path
  $moduleName = $file -replace '^packages/[^/]+/src/', '' -replace '\.(ts|tsx)$', '' -replace '[\\/]', '.'
  
  # Add const logger after the createLogger import line
  $pattern = "(import \{ createLogger \} from '@ideia/logger';)"
  $replacement = "`$1`nconst logger = createLogger('$moduleName');"
  $newContent = $content -replace $pattern, $replacement
  
  if ($newContent -ne $content) {
    Set-Content -Path $fullPath -Value $newContent -NoNewline
    Write-Host "FIXED: $file (module: $moduleName)"
    $fixed++
  } else {
    Write-Host "NO MATCH: $file"
  }
}
Write-Host "`n=== DONE: $fixed fixed, $skipped skipped ==="