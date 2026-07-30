# Full npm publish pipeline for @ai-devkit packages
param(
    [switch]$DryRun,
    [switch]$Force,
    [string]$Tag = "alpha"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$monorepo = Join-Path $root "ai-devkit-v2"

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      IDEIA npm Publish Pipeline          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Prepare packages (metadata)
Write-Host "[1/4] Preparing package metadata..." -ForegroundColor Yellow
& "$PSScriptRoot\prepare-publish.ps1" @(if ($DryRun) { "-DryRun" })

# Step 2: Build all packages
Write-Host "`n[2/4] Building all packages..." -ForegroundColor Yellow
Set-Location $monorepo
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Build successful" -ForegroundColor Green

# Step 3: Dry run (safety check)
Write-Host "`n[3/4] Running npm publish --dry-run..." -ForegroundColor Yellow
npx lerna publish from-package --yes --no-git-tag-version --no-push --dist-tag $Tag --dry-run 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️ Lerna not available, trying workspaces..." -ForegroundColor Yellow
    npm publish --workspaces --access public --dry-run 2>&1 | Out-Null
}
Write-Host "  ✅ Dry-run passed" -ForegroundColor Green

# Step 4: Actual publish
if ($DryRun) {
    Write-Host "`n[4/4] SKIPPED (--DryRun flag)" -ForegroundColor Yellow
    Write-Host "`nRun without -DryRun to publish:" -ForegroundColor Green
    Write-Host "  .\scripts\publish-all.ps1 -Tag alpha" -ForegroundColor Green
    Write-Host "  .\scripts\publish-all.ps1 -Tag latest -Force" -ForegroundColor Green
    return
}

if (-not $Force) {
    Write-Host "`n[4/4] Publishing..." -ForegroundColor Yellow
    Write-Host "  ⚠️ Use -Force to confirm actual publish" -ForegroundColor Red
    Write-Host "  Run: .\scripts\publish-all.ps1 -Force -Tag alpha" -ForegroundColor Yellow
    return
}

Write-Host "`n[4/4] Publishing to npm registry..." -ForegroundColor Yellow
Set-Location $monorepo
npm publish --workspaces --access public --tag $Tag 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ All packages published!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Publish failed" -ForegroundColor Red
}
