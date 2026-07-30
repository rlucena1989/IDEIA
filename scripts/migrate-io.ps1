param(
    [string]$TargetDir = "packages/cli/src"
)

$ErrorActionPreference = 'Continue'

function Migrate-File {
    param($FilePath)
    $content = Get-Content $FilePath -Raw
    $changed = $false
    
    # Skip if already uses getIO
    if ($content -match "import \{ getIO \} from '\.\.\/io'") { return $false }
    if ($content -match "import \{ getIO \} from '\.\.\/\.\.\/io'") { return $false }
    # Skip common/index
    
    $hasFs = $content -match "from ['`"](node:)?fs['`"]" -or $content -match "require\(['`"](node:)?fs['`"]\)"
    if (-not $hasFs) { return $false }
    
    # Check if it truly uses fs.something - exclude type imports
    $hasFsCall = $content -match "fs\.(readFileSync|writeFileSync|existsSync|mkdirSync|readdirSync|statSync|rmSync|unlinkSync|appendFileSync|copyFileSync|cpSync|readFile|writeFile|exists|mkdir|readdir|stat)"
    if (-not $hasFsCall) { return $false }
    
    Write-Host "Migrating: $($FilePath.Substring(52))"
    
    # Count relative depth for import path
    $depth = ($FilePath.Replace('\', '/') -split '/').Length - ($TargetDir.Replace('\', '/') -split '/').Length - 1
    $ioPath = if ($depth -le 1) { "'../io'" } else { "'" + "../" * ($depth - 1) + "io'" }
    
    # Add getIO import after last import or at top
    if ($content -match "^(import .+)$(?:[\r\n]import .+)*\K(?=[\r\n])") {
        # Add before any non-import line
    }
    
    # Replace fs calls
    $replacements = @(
        @{from='fs\.readFileSync\(|fs\.readFile\('; to="getIO().fs.read("}
        @{from='fs\.writeFileSync\(|fs\.writeFile\('; to="getIO().fs.write("}
        @{from='fs\.existsSync\('; to="getIO().fs.exists("}
        @{from='fs\.mkdirSync\('; to="getIO().fs.mkDir("}
        @{from='fs\.readdirSync\('; to="getIO().fs.readDir("}
        @{from='fs\.statSync\('; to="getIO().fs.stat("}
        @{from='fs\.rmSync\('; to="getIO().fs.remove("}
        @{from='fs\.unlinkSync\('; to="getIO().fs.remove("}
        @{from='fs\.appendFileSync\(|fs\.appendFile\('; to="getIO().fs.append("}
        @{from='fs\.copyFileSync\(|fs\.copyFile\('; to="getIO().fs.copy("}
        @{from='fs\.cpSync\('; to="getIO().fs.copy("}
        @{from='fs\.ensureDirSync\(|fs\.ensureDir\('; to="getIO().fs.ensureDir("}
    )
    
    foreach ($r in $replacements) {
        if ($content -match $r.from) {
            $content = $content -replace $r.from, $r.to
            $changed = $true
        }
    }
    
    if (-not $changed) { return $false }
    
    # Add getIO import
    # Find if there's already an @ideia/logger or other third-party import
    $lines = $content -split "`n"
    $newLines = @()
    $added = $false
    foreach ($line in $lines) {
        $newLines += $line
        if (-not $added -and $line -match "^import .+ from ['`"](\.\.?/)") {
            # After the last relative import (or before it)
        }
    }
    
    # Simple approach: add import after the last import line
    $lastImportIdx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^import ") {
            $lastImportIdx = $i
        }
    }
    
    if ($lastImportIdx -ge 0) {
        $lines = $lines[0..$lastImportIdx] + @("import { getIO } from $ioPath;") + $lines[($lastImportIdx+1)..($lines.Count-1)]
    } else {
        $lines = @("import { getIO } from $ioPath;") + $lines
    }
    
    # Remove fs import if present
    $filteredLines = @()
    $skipNext = $false
    foreach ($line in $lines) {
        if ($line -match "import .+ from ['`"](node:)?fs['`"]" -or $line -match "import \* as fs from") {
            continue
        }
        $filteredLines += $line
    }
    
    $newContent = $filteredLines -join "`n"
    Set-Content -Path $FilePath -Value $newContent -NoNewline
    return $true
}

$files = Get-ChildItem -Path $TargetDir -Recurse -Filter "*.ts" -File |
    Where-Object { $_.FullName -notmatch "node_modules|__tests__|\.test\.|\.spec\.|\\dist\\|\\io\\|\\domain\\" }

$count = 0
foreach ($f in $files) {
    $result = Migrate-File $f.FullName
    if ($result) { $count++ }
}

Write-Host "Migrated $count files"
