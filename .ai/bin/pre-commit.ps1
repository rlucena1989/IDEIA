param([switch]$NoLint, [switch]$NoTest)

$root = Resolve-Path "$PSScriptRoot/../.."
$failures = 0

Write-Host "=== IDEIA Pre-commit Hook ===" -ForegroundColor Cyan

# 1. Lint
if (-not $NoLint) {
    Write-Host "[1/5] Running ESLint..." -NoNewline
    $result = & "npx.cmd" eslint --fix 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Host " ✅" -ForegroundColor Green }
    else { Write-Host " ❌ FAIL" -ForegroundColor Red; $failures++ }
}

# 2. Typecheck
Write-Host "[2/5] Running TypeScript check..." -NoNewline
$result = & "npx.cmd" tsc -b 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host " ✅" -ForegroundColor Green }
else { Write-Host " ❌ FAIL" -ForegroundColor Red; $failures++ }

# 3. Test changed files
if (-not $NoTest) {
    Write-Host "[3/5] Running tests for changed files..."
    Push-Location $root
    $changed = & "git.cmd" diff --cached --name-only --diff-filter=ACMR 2>&1
    if ($changed) {
        $result = & "npx.cmd" jest --changedSince HEAD~1 --no-coverage 2>&1
        if ($LASTEXITCODE -eq 0) { Write-Host "  ✅" -ForegroundColor Green }
        else { Write-Host "  ❌ FAIL" -ForegroundColor Red; $failures++ }
    } else {
        Write-Host "  ⏭ No changed files to test" -ForegroundColor Yellow
    }
    Pop-Location
}

# 4. Gap check
Write-Host "[4/5] Running gap check..." -NoNewline
Push-Location $root
$result = & "node.cmd" ".ai/bin/gap-check.js" --ci 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host " ✅" -ForegroundColor Green }
else { Write-Host " ❌ FAIL" -ForegroundColor Red; $failures++ }
Pop-Location

# 5. Secret check
Write-Host "[5/5] Checking secrets..." -NoNewline
Push-Location $root
$result = & "node.cmd" ".ai/bin/check-secrets.js" --ci 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host " ✅" -ForegroundColor Green }
else { Write-Host " ❌ FAIL" -ForegroundColor Red; $failures++ }
Pop-Location

if ($failures -eq 0) {
    Write-Host "`n✅ ALL CHECKS PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ $failures check(s) failed" -ForegroundColor Red
    exit 1
}
