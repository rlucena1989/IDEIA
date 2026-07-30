# Bootstrap script: links @ai-devkit/* packages between monorepo and Theia plugin
# Run from workspace root: powershell -File scripts\link-packages.ps1

$root = Split-Path -Parent $PSScriptRoot
$monorepo = Join-Path $root "ai-devkit-v2"
$theiaPlugin = Join-Path $root "ideia-theia"

Write-Host "=== IDEIA Package Linker ===" -ForegroundColor Cyan
Write-Host "Monorepo: $monorepo"
Write-Host "Theia:    $theiaPlugin"

# Step 1: Build all packages in monorepo
Write-Host "`n[1/4] Building @ai-devkit packages..." -ForegroundColor Yellow
Set-Location $monorepo
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Build failed! Attempting individual builds..." -ForegroundColor Red
    $packages = Get-ChildItem (Join-Path $monorepo "packages") -Directory
    foreach ($pkg in $packages) {
        $pkgJson = Join-Path $pkg.FullName "package.json"
        if (Test-Path $pkgJson) {
            Set-Location $pkg.FullName
            npx tsc 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ $($pkg.Name)" -ForegroundColor Green
            } else {
                Write-Host "  ❌ $($pkg.Name)" -ForegroundColor Red
            }
        }
    }
}

# Step 2: Create npm links for each @ai-devkit package
Write-Host "`n[2/4] Creating npm links..." -ForegroundColor Yellow
$packages = Get-ChildItem (Join-Path $monorepo "packages") -Directory
$linked = 0
foreach ($pkg in $packages) {
    $pkgJson = Join-Path $pkg.FullName "package.json"
    if (Test-Path $pkgJson) {
        $name = (Get-Content $pkgJson -Raw | ConvertFrom-Json).name
        if ($name -and $name.StartsWith("@ai-devkit/")) {
            Set-Location $pkg.FullName
            npm link 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  🔗 $name" -ForegroundColor Green
                $linked++
            }
        }
    }
}
Write-Host "  → $linked packages linked" -ForegroundColor Green

# Step 3: Link packages into Theia plugin
Write-Host "`n[3/4] Linking into IDEIA Theia plugin..." -ForegroundColor Yellow
Set-Location $theiaPlugin
$packages = Get-ChildItem (Join-Path $monorepo "packages") -Directory
$installed = 0
foreach ($pkg in $packages) {
    $pkgJson = Join-Path $pkg.FullName "package.json"
    if (Test-Path $pkgJson) {
        $name = (Get-Content $pkgJson -Raw | ConvertFrom-Json).name
        if ($name -and $name.StartsWith("@ai-devkit/")) {
            npm link $name 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  🔗 $name" -ForegroundColor Green
                $installed++
            }
        }
    }
}
Write-Host "  → $installed packages linked" -ForegroundColor Green

# Step 4: Install remaining Theia dependencies
Write-Host "`n[4/4] Installing Theia dependencies..." -ForegroundColor Yellow
Set-Location $theiaPlugin
npm install --legacy-peer-deps 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Theia dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Some Theia dependencies may be missing" -ForegroundColor Yellow
}

# Verify
Write-Host "`n=== Verification ===" -ForegroundColor Cyan
Set-Location $theiaPlugin
npx tsc -b 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Theia plugin compiles successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Theia plugin has compilation errors" -ForegroundColor Red
    npx tsc -b 2>&1
}

Set-Location $root
Write-Host "`nDone!" -ForegroundColor Cyan
