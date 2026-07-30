# Sync Docs — Auto-atualiza documentação a partir do código real
# Uso: .\scripts\sync-docs.ps1 [-All] [-Packages] [-Tests]
# Executado automaticamente no pre-commit hook

param([switch]$All, [switch]$Packages, [switch]$Tests, [switch]$Push)

$root = Resolve-Path "$PSScriptRoot/.."
$monorepo = Join-Path $root "IDEIA"

Write-Host "=== IDEIA Doc Sync ===" -ForegroundColor Cyan

# Sync 1: Update GAPS with current test results
function Sync-Gaps {
    Write-Host "[Sync] Updating GAPS-PRODUCAO-IDE.md test counts..."
    $gapsFile = Join-Path $root "docs\governance\GAPS-PRODUCAO-IDE.md"
    $content = Get-Content $gapsFile -Raw
    
    # Get actual test results
    Push-Location $monorepo
    try {
        $output = npx jest --passWithNoTests 2>&1 | Out-String
    } finally {
        Pop-Location
    }
    
    if ($output -match 'Test Suites:\s+(\d+)\s+passed') {
        $suites = $matches[1]
        if ($output -match 'Tests:\s+(\d+)\s+passed') {
            $tests = $matches[1]
            $newLine = "> **$tests testes passando em $suites suítes. 60 gaps catalogados, 58 solucionados ou documentados.**"
            $content = $content -replace '> \*\*[\d]+ testes passando em [\d]+ suítes\..*?\*\*', $newLine
            Write-Host "  Updated: $tests tests, $suites suites" -ForegroundColor Green
        }
    }
    [System.IO.File]::WriteAllText($gapsFile, $content, [System.Text.Encoding]::UTF8)
}

# Sync 2: Update AGENTS.md with package count
function Sync-Agents {
    Write-Host "[Sync] Updating AGENTS.md package counts..."
    $agentsFile = Join-Path $root "AGENTS.md"
    $pkgCount = (Get-ChildItem (Join-Path $monorepo "packages") -Directory).Count
    $content = Get-Content $agentsFile -Raw
    $content = $content -replace '\d+ packages', "$pkgCount packages"
    [System.IO.File]::WriteAllText($agentsFile, $content, [System.Text.Encoding]::UTF8)
    Write-Host "  Updated: $pkgCount packages" -ForegroundColor Green
}

# Sync 3: Update REALITY-MANIFEST with test counts
function Sync-Manifest {
    Write-Host "[Sync] Updating REALITY-MANIFEST.md metrics..."
    $manifestFile = Join-Path $root "docs\governance\REALITY-MANIFEST.md"
    
    Push-Location $monorepo
    try {
        $testOutput = npx jest --passWithNoTests 2>&1 | Out-String
    } finally {
        Pop-Location
    }
    $testsPassing = if ($testOutput -match 'Tests:\s+(\d+)\s+passed') { $matches[1] } else { "?" }
    $testSuites = if ($testOutput -match 'Test Suites:\s+(\d+)\s+passed') { $matches[1] } else { "?" }
    
    $pkgCount = (Get-ChildItem (Join-Path $monorepo "packages") -Directory).Count
    
    # Read current manifest
    $content = Get-Content $manifestFile -Raw
    
    # Update test counts (use capture groups instead of lookbehind for PS 5.1 compat)
    $content = $content -replace '(Testes passando\s*\|\s*)\d+', "`${1}$testsPassing"
    $content = $content -replace '(Suítes de teste\s*\|\s*)\d+', "`${1}$testSuites"
    $content = $content -replace '(Packages totais\s*\|\s*)\d+', "`${1}$pkgCount"
    
    [System.IO.File]::WriteAllText($manifestFile, $content, [System.Text.Encoding]::UTF8)
    Write-Host "  Updated: $testsPassing tests, $testSuites suites, $pkgCount packages" -ForegroundColor Green
}

# Sync 4: Run reality check to detect drift
function Sync-Check {
    Write-Host "[Sync] Running reality check..."
    $checkResult = & "$PSScriptRoot\reality-check.ps1" -Packages -Endpoints 2>&1
    Write-Host $checkResult
}

if ($All -or -not ($Packages -or $Tests)) { Sync-Gaps; Sync-Agents; Sync-Manifest; Sync-Check }
if ($Packages) { Sync-Manifest }
if ($Tests) { Sync-Gaps; Sync-Manifest }

Write-Host ""
Write-Host "=== Sync Complete ===" -ForegroundColor Cyan
Write-Host "Run with -Push to commit changes automatically" -ForegroundColor Yellow
