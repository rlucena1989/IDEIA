# Prepare all @ai-devkit packages for npm publish
param([switch]$DryRun)

$root = Split-Path -Parent $PSScriptRoot
$monorepo = Join-Path $root "ai-devkit-v2"
$repoUrl = "https://github.com/anomalyco/ideia"
$bugsUrl = "$repoUrl/issues"
$homepageUrl = "https://ideia.dev"

$packages = Get-ChildItem (Join-Path $monorepo "packages") -Directory
${count} = 0

foreach ($pkg in $packages) {
    $pkgJson = Join-Path $pkg.FullName "package.json"
    if (-not (Test-Path $pkgJson)) { continue }
    
    $json = Get-Content $pkgJson -Raw | ConvertFrom-Json
    $name = $json.name
    if (-not $name -or -not $name.StartsWith("@ai-devkit/")) { continue }
    
    $changed = $false
    
    # Add repository
    if (-not $json.repository) {
        $json | Add-Member -NotePropertyName "repository" -NotePropertyValue @{ type = "git"; url = "$repoUrl.git" } -Force
        $changed = $true
        if (-not $DryRun) { Write-Host "  📦 ${name}: +repository" -ForegroundColor Green }
    }
    
    # Add bugs
    if (-not $json.bugs) {
        $json | Add-Member -NotePropertyName "bugs" -NotePropertyValue @{ url = $bugsUrl } -Force
        $changed = $true
        if (-not $DryRun) { Write-Host "  📦 ${name}: +bugs" -ForegroundColor Green }
    }
    
    # Add homepage  
    if (-not $json.homepage) {
        $json | Add-Member -NotePropertyName "homepage" -NotePropertyValue $homepageUrl -Force
        $changed = $true
        if (-not $DryRun) { Write-Host "  📦 ${name}: +homepage" -ForegroundColor Green }
    }
    
    # Add publishConfig if missing
    if (-not $json.publishConfig) {
        $json | Add-Member -NotePropertyName "publishConfig" -NotePropertyValue @{ access = "public" } -Force
        $changed = $true
        if (-not $DryRun) { Write-Host "  📦 ${name}: +publishConfig" -ForegroundColor Green }
    }
    
    if ($changed -and -not $DryRun) {
        $newJson = $json | ConvertTo-Json -Depth 10
        Set-Content -Path $pkgJson -Value $newJson -NoNewline
        ${count}++
    }
    
    # Generate README if missing
    $readmePath = Join-Path $pkg.FullName "README.md"
    if (-not (Test-Path $readmePath) -and -not $DryRun) {
        $desc = if ($json.description) { $json.description } else { "IDEIA package: $name" }
        $readme = @"
# $name

> $desc

Part of the [IDEIA](https://ideia.dev) ecosystem — AI-powered IDE that transforms ideas into complete systems.

## Installation

\`\`\`bash
npm install $name
\`\`\`

## License

MIT
"@
        Set-Content -Path $readmePath -Value $readme -Encoding utf8
        Write-Host "  📄 ${name}: README.md created" -ForegroundColor Cyan
    }
}

Write-Host "`nDone! ${count} packages updated." -ForegroundColor Green
Write-Host "`nTo publish all packages:" -ForegroundColor Yellow
Write-Host "  cd ai-devkit-v2" -ForegroundColor Yellow
Write-Host "  npm publish --workspaces --access public --dry-run  # test first" -ForegroundColor Yellow
Write-Host "  npm publish --workspaces --access public            # actual publish" -ForegroundColor Yellow
