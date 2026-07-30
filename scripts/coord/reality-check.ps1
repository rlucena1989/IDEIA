param([switch]$Full, [switch]$Packages, [switch]$Endpoints, [switch]$Negative, [switch]$Fix)

$root = Resolve-Path "$PSScriptRoot/.."
$monorepo = Join-Path $root "IDEIA"
$manifest = Join-Path $monorepo "docs\governance\REALITY-MANIFEST.md"
$errors = @()
$warnings = @()

Write-Host "=== IDEIA Reality Check ===" -ForegroundColor Cyan

function Check-Packages {
    Write-Host "[Packages] Verifying packages exist..."
    if (-not (Test-Path $manifest)) {
        $script:errors += "Manifest not found: $manifest"
        return
    }
    $content = Get-Content $manifest -Raw
    $declared = @()
    # Match both @ideia/ and @ai-devkit/ scopes
    $content | Select-String -Pattern '`@(?:ideia|ai-devkit)/([^`]+)`' -AllMatches | ForEach-Object {
        $_.Matches | ForEach-Object { $declared += $_.Groups[1].Value }
    }
    $pkgPath = Join-Path $monorepo "packages"
    if (-not (Test-Path $pkgPath)) {
        $script:errors += "Packages directory not found: $pkgPath"
        return
    }
    $actual = Get-ChildItem $pkgPath -Directory | ForEach-Object { $_.Name }
    
    foreach ($pkg in $declared) {
        if ($pkg -notin $actual -and $pkg -ne 'api') {
            $script:warnings += "Package declared but NOT FOUND: $pkg"
        }
    }
    foreach ($pkg in $actual) {
        if ($pkg -notin $declared) {
            $script:warnings += "Package exists but NOT DECLARED in manifest: $pkg"
        }
    }
    
    Write-Host "  $($declared.Count) declared, $($actual.Count) actual" -ForegroundColor Green
}

function Check-Endpoints {
    Write-Host "[Endpoints] Verifying API endpoints..."
    if (-not (Test-Path $manifest)) {
        $script:errors += "Manifest not found: $manifest"
        return
    }
    $content = Get-Content $manifest -Raw
    
    $declared = @()
    $content | Select-String -Pattern '`(/api/[^\s]+)`' -AllMatches | ForEach-Object {
        $_.Matches | ForEach-Object { $declared += $_.Groups[1].Value }
    }
    
    # Check endpoints in both monorepos
    $actual = @()
    $routeFiles = @()
    
    # IDEIA monorepo — scan all packages for route definitions
    $dirsToCheck = @(
        (Join-Path $monorepo "packages\cli\src\ide"),
        (Join-Path $monorepo "packages\ideia-plugin\src\node"),
        (Join-Path $monorepo "packages\cli\src\runtime"),
        (Join-Path $monorepo "packages\cli\src\commands"),
        (Join-Path $monorepo "packages\execution-layer\src"),
        (Join-Path $monorepo "packages\delivery-orchestrator\src"),
        (Join-Path $monorepo "packages\mcp\src")
    )
    foreach ($d in $dirsToCheck) {
        if (Test-Path $d) {
            $routeFiles += Get-ChildItem $d -Filter "*.ts" -Recurse -ErrorAction SilentlyContinue
        }
    }
    
    # Also check ai-devkit-v2 API (source for migration)
    $altApiDir = Join-Path $root "ai-devkit-v2\apps\api\src"
    if (Test-Path $altApiDir) {
        $routeFiles += Get-ChildItem $altApiDir -Filter "*.ts" -Recurse -ErrorAction SilentlyContinue
    }
    
    foreach ($file in $routeFiles) {
        $fileContent = Get-Content $file.FullName -Raw
        # Also scan for IDEIA-specific route patterns (app.get/post/route, router.get/post, etc.)
        $fileContent | Select-String -Pattern "['""](/api/[^'""]+)['""]" -AllMatches | ForEach-Object {
            $_.Matches | ForEach-Object { if ($_.Groups[1].Value -notin $actual) { $actual += $_.Groups[1].Value } }
        }
        $fileContent | Select-String -Pattern "(?:GET|POST|PUT|PATCH|DELETE|USE)\s+(/api/[\w/:.-]+)" -AllMatches | ForEach-Object {
            $_.Matches | ForEach-Object { if ($_.Groups[1].Value -notin $actual) { $actual += $_.Groups[1].Value } }
        }
        # Scan for Express/Fastify-style route registration
        $fileContent | Select-String -Pattern "\.(?:get|post|put|patch|delete|all)\(['""](/api/[^'""]+)['""]" -AllMatches | ForEach-Object {
            $_.Matches | ForEach-Object { if ($_.Groups[1].Value -notin $actual) { $actual += $_.Groups[1].Value } }
        }
    }
    
    foreach ($ep in $declared) {
        if ($ep -notin $actual) { $script:warnings += "Endpoint declared but NOT FOUND IN CODE: $ep" }
    }
    
    Write-Host "  $($declared.Count) declared, $($actual.Count) actual" -ForegroundColor Green
}

function Check-Negative {
    Write-Host "[Negative] Verifying claims..."
    if (-not (Test-Path $manifest)) { return }
    
    # Expanded list of technologies the manifesto claims don't exist
    $negativeClaims = @{
        'Cedar'              = @('cedar', 'CedarPolicy')
        'LangGraph'          = @('langgraph', 'LangGraph', 'StateGraph')
        'Mem0'               = @('mem0')
        'Redis'              = @('redis')
        'DAP'                = @('dap-bridge', 'DebugPanel', 'dap-client')
        'Electron/Tauri'     = @('electron', 'BrowserWindow')
        'DSPy'               = @('dspy')
        'ArgoCD'             = @('argocd')
        'NATS JetStream'     = @('nats', 'JetStream', 'NATS')
        'PostgreSQL+pgvector' = @('pgvector', 'postgres')
    }
    
    # Search in both monorepos for thoroughness
    $searchDirs = @()
    if (Test-Path $monorepo) { $searchDirs += $monorepo }
    $altRepo = Join-Path $root "ai-devkit-v2"
    if (Test-Path $altRepo -and $altRepo -ne $monorepo) { $searchDirs += $altRepo }
    
    foreach ($tech in $negativeClaims.Keys) {
        $patterns = $negativeClaims[$tech]
        $found = $false
        foreach ($searchDir in $searchDirs) {
            $pkgPath = Join-Path $searchDir "packages"
            if (-not (Test-Path $pkgPath)) { continue }
            foreach ($pattern in $patterns) {
                $result = Get-ChildItem $pkgPath -Recurse -Filter "*.ts" -Exclude "*node_modules*" -ErrorAction SilentlyContinue | 
                    Select-String -Pattern $pattern -SimpleMatch -Quiet -ErrorAction SilentlyContinue
                if ($result) { $found = $true; break }
            }
            if ($found) { break }
        }
        if ($found) {
            $script:warnings += "NEGATIVE CLAIM WRONG: $tech - found in code"
        }
    }
}

if ($Full -or $Packages -or -not ($Endpoints -or $Negative)) { Check-Packages }
if ($Full -or $Endpoints) { Check-Endpoints }
if ($Full -or $Negative) { Check-Negative }
if ($Full) { Write-Host "[Tests] Skipping full test suite for performance" }

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "ALL CHECKS PASSED" -ForegroundColor Green
    exit 0
}
if ($errors.Count -gt 0) {
    Write-Host "ERRORS ($($errors.Count)):" -ForegroundColor Red
    foreach ($e in $errors) { Write-Host "  $e" -ForegroundColor Red }
}
if ($warnings.Count -gt 0) {
    Write-Host "WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($w in $warnings) { Write-Host "  $w" -ForegroundColor Yellow }
}
exit $errors.Count
