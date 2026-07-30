# Pre-flight Check — Executa antes de qualquer operação da IA
# Garante que o contexto está fresco e a documentação reflete a realidade
# Uso automático: chamado pelo CLI antes de qualquer comando

$root = Resolve-Path "$PSScriptRoot/.."
$monorepo = Join-Path $root "IDEIA"

Write-Host "=== IDEIA Pre-flight Check ===" -ForegroundColor Cyan

$failures = 0
$warningsCount = 0

# Check 1: Manifest exists
$manifest = Join-Path $monorepo "docs\governance\REALITY-MANIFEST.md"
if (-not (Test-Path $manifest)) {
    Write-Host "  [FAIL] REALITY-MANIFEST.md not found at $manifest" -ForegroundColor Red
    $failures++
}

# Check 2: Reality check passes
$checkResult = & "$PSScriptRoot\reality-check.ps1" -Packages -Endpoints 2>&1
$checkExitCode = $LASTEXITCODE
if ($checkExitCode -ne 0) {
    Write-Host "  [FAIL] Reality check FAILED (exit code: $checkExitCode)!" -ForegroundColor Red
    $failures++
} elseif ($checkResult -match 'WARNINGS') {
    Write-Host "  [WARN] Reality check has warnings. Counting as failure." -ForegroundColor Yellow
    $warningsCount++
}

# Check 3: Docs synced recently
if (Test-Path $manifest) {
    $manifestAge = (Get-Date) - (Get-Item $manifest).LastWriteTime
    if ($manifestAge.TotalDays -gt 1) {
        Write-Host "  [WARN] Manifest is $([int]$manifestAge.TotalHours) hours old. Run sync-docs.ps1" -ForegroundColor Yellow
    }
}

# Check 4: Gaps doc exists
$gapsFile = Join-Path $monorepo "docs\governance\GAPS-PRODUCAO-IDE.md"
if (-not (Test-Path $gapsFile)) {
    Write-Host "  [WARN] GAPS-PRODUCAO-IDE.md not found at $gapsFile" -ForegroundColor Yellow
}

# Check 5: IDEIA package.json exists
$rootPkg = Join-Path $monorepo "package.json"
if (-not (Test-Path $rootPkg)) {
    Write-Host "  [WARN] IDEIA/package.json not found at $rootPkg" -ForegroundColor Yellow
}

# Check 6: Verify no critical (🔴) gaps unresolved
$gapsFile = Join-Path $monorepo "docs\governance\GAPS-PRODUCAO-IDE.md"
if (Test-Path $gapsFile) {
    $gapsContent = Get-Content $gapsFile -Raw -ErrorAction SilentlyContinue
    if ($gapsContent -match '🔴.*?\|.*?❌') {
        Write-Host "  [FAIL] Critical gaps (🔴) found unresolved! Check GAPS-PRODUCAO-IDE.md" -ForegroundColor Red
        $failures++
    }
}

Write-Host ""
$totalFails = $failures + $warningsCount
if ($totalFails -eq 0) {
    Write-Host "[PASS] PRE-FLIGHT PASSED - Context is fresh" -ForegroundColor Green
    exit 0
} else {
    $reason = if ($failures -gt 0) { "$failures critical issue(s)" } else { "$warningsCount warning(s)" }
    Write-Host "[FAIL] PRE-FLIGHT FAILED - $reason" -ForegroundColor Red
    Write-Host "Run: .\scripts\sync-docs.ps1 -All" -ForegroundColor Yellow
    exit 1
}
