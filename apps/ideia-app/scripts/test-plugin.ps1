# Test Plugin — Verifica se o plugin IDEIA carrega corretamente
$root = Split-Path -Parent $PSScriptRoot
$pluginPath = Join-Path $root "node_modules\@ideia\theia-plugin"

Write-Host "=== IDEIA Plugin Verification ===" -ForegroundColor Cyan

# Check 1: Plugin exists
if (-not (Test-Path $pluginPath)) {
    Write-Host "  ❌ Plugin not found at $pluginPath" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Plugin found at $pluginPath" -ForegroundColor Green

# Check 2: Plugin has required files
$required = @(
    "package.json",
    "lib\browser\ideia-frontend-module.js",
    "lib\browser\ideia-chat-widget.js",
    "lib\browser\ideia-chat-contribution.js",
    "lib\browser\ideia-diff-widget.js",
    "lib\browser\ideia-approval-widget.js",
    "lib\browser\ideia-dashboard-widget.js",
    "lib\browser\ideia-file-widget.js",
    "lib\browser\ideia-service-client.js",
    "lib\node\ideia-backend-module.js",
    "lib\node\ideia-chat-service.js",
    "lib\node\ideia-task-service.js",
    "lib\node\ideia-agent-service.js",
    "lib\node\ideia-memory-service.js",
    "lib\node\ideia-dashboard-service.js",
    "lib\common\ideia-protocol.js",
    "lib\common\ideia-types.js",
    "style\ideia.css"
)

$missing = 0
foreach ($file in $required) {
    $fullPath = Join-Path $pluginPath $file
    if (-not (Test-Path $fullPath)) {
        Write-Host "  ❌ Missing: $file" -ForegroundColor Red
        $missing++
    }
}

if ($missing -eq 0) {
    Write-Host "  ✅ All $($required.Count) required files present" -ForegroundColor Green
}

# Check 3: Plugin has valid theiaExtensions
$pkgJson = Get-Content (Join-Path $pluginPath "package.json") -Raw | ConvertFrom-Json
if ($pkgJson.theiaExtensions -and $pkgJson.theiaExtensions.Count -gt 0) {
    Write-Host "  ✅ theiaExtensions configured: $($pkgJson.theiaExtensions.Count) extension(s)" -ForegroundColor Green
    foreach ($ext in $pkgJson.theiaExtensions) {
        $front = $ext.frontend -replace 'lib/', 'lib/'
        $back = $ext.backend -replace 'lib/', 'lib/'
        $frontPath = Join-Path $pluginPath ($front + '.js')
        $backPath = Join-Path $pluginPath ($back + '.js')
        if (Test-Path $frontPath) { Write-Host "      Frontend: $front ✅" -ForegroundColor Green }
        else { Write-Host "      Frontend: $front ❌" -ForegroundColor Red; $missing++ }
        if (Test-Path $backPath) { Write-Host "      Backend: $back ✅" -ForegroundColor Green }
        else { Write-Host "      Backend: $back ❌" -ForegroundColor Red; $missing++ }
    }
}

# Check 4: Dependencies resolve
$aiDevkitDeps = @("event-bus", "llm-provider", "policy-engine", "memory-store", "agent-runtime", "delivery-orchestrator", "verification-layer")
foreach ($dep in $aiDevkitDeps) {
    $depPath = Join-Path $pluginPath "node_modules\@ai-devkit\$dep"
    if (-not (Test-Path $depPath)) {
        Write-Host "  ⚠️ @ai-devkit/$dep not resolved in plugin node_modules (may use hoisted)" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($missing -eq 0) {
    Write-Host "✅ Plugin verification PASSED" -ForegroundColor Green
    Write-Host "  Run: cd theia-app && npm run start" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ $missing file(s) missing" -ForegroundColor Red
    exit 1
}
