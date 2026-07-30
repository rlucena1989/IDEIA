$rootA = "F:\PROJETOS\ai-devkit-workspace\docs"
$rootB = "F:\PROJETOS\ai-devkit-workspace\IDEIA\docs"

$itemsA = Get-ChildItem -LiteralPath $rootA -Recurse -File
$itemsB = Get-ChildItem -LiteralPath $rootB -Recurse -File

$mapA = @{}
foreach ($item in $itemsA) {
    $rel = $item.FullName.Substring($rootA.Length).TrimStart('\')
    $mapA[$rel] = $item
}

$mapB = @{}
foreach ($item in $itemsB) {
    $rel = $item.FullName.Substring($rootB.Length).TrimStart('\')
    $mapB[$rel] = $item
}

$report = @()

$report += "============================================================"
$report += "  COMPLETE DIRECTORY COMPARISON REPORT"
$report += "  A: $rootA"
$report += "  B: $rootB"
$report += "============================================================"
$report += ""

$report += "=== SECTION 1: Files in A (root docs) compared to B (IDEIA docs) ==="
$report += ""

foreach ($rel in ($mapA.Keys | Sort-Object)) {
    $aItem = $mapA[$rel]
    $existsB = $mapB.ContainsKey($rel)
    $sizeMatch = $false
    $contentMatch = $false
    
    $line = "FILE: $rel`n"
    $line += "  A: size=$($aItem.Length)  modified=$(Get-Date $aItem.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')`n"
    
    if ($existsB) {
        $bItem = $mapB[$rel]
        if ($aItem.Length -eq $bItem.Length) {
            $sizeMatch = $true
            $bytesA_100 = [System.IO.File]::ReadAllBytes($aItem.FullName) | Select-Object -First 100
            $bytesB_100 = [System.IO.File]::ReadAllBytes($bItem.FullName) | Select-Object -First 100
            $diff = Compare-Object $bytesA_100 $bytesB_100
            if (-not $diff) {
                $contentMatch = $true
            }
        }
        $line += "  B: size=$($bItem.Length)  modified=$(Get-Date $bItem.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')`n"
        
        if ($contentMatch) {
            $status = "IDENTICAL (size + first 100 bytes match)"
        } elseif ($sizeMatch) {
            $status = "SAME_SIZE but DIFFERENT content (first 100 bytes differ)"
        } else {
            $status = "DIFFERENT_SIZE (A=$($aItem.Length) vs B=$($bItem.Length))"
        }
        $line += "  STATUS: $status`n"
    } else {
        $line += "  B: (DOES NOT EXIST)`n"
        $line += "  STATUS: MISSING_IN_B`n"
    }
    $report += $line
}

$report += ""

$report += "=== SECTION 2: Files in B (IDEIA docs) that do NOT exist in A (root docs) ==="
$report += ""
foreach ($rel in ($mapB.Keys | Sort-Object)) {
    if (-not $mapA.ContainsKey($rel)) {
        $bItem = $mapB[$rel]
        $line = "FILE: $rel`n"
        $line += "  B: size=$($bItem.Length)  modified=$(Get-Date $bItem.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')`n"
        $report += $line
    }
}

$report += ""

$report += "=== SECTION 3: Specific files requested ==="
$report += ""
$specificFiles = @(
    "livro-IDEIA-ANALISE-CRUZADA.md",
    "livro-IDEIA.md",
    "PLANO-IMPLEMENTACAO-THEIA-MOCKUP.md",
    "audit-dashboard.html"
)
foreach ($f in $specificFiles) {
    $pathA = "F:\PROJETOS\ai-devkit-workspace\docs\$f"
    $pathB = "F:\PROJETOS\ai-devkit-workspace\IDEIA\docs\$f"
    $existsA = Test-Path -LiteralPath $pathA
    $existsB = Test-Path -LiteralPath $pathB
    $line = "FILE: $f`n"
    $line += "  Exists in A (root docs): $existsA`n"
    $line += "  Exists in B (IDEIA docs): $existsB`n"
    if ($existsA) { $item = Get-Item -LiteralPath $pathA; $line += "  A: size=$($item.Length)  modified=$(Get-Date $item.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')`n" }
    if ($existsB) { $item = Get-Item -LiteralPath $pathB; $line += "  B: size=$($item.Length)  modified=$(Get-Date $item.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')`n" }
    $report += $line
}

$report += ""

$report += "=== SECTION 4: governance/ subdirectory deep comparison ==="
$report += ""
$govRootA = "F:\PROJETOS\ai-devkit-workspace\docs\governance"
$govRootB = "F:\PROJETOS\ai-devkit-workspace\IDEIA\docs\governance"
$govA = Get-ChildItem -LiteralPath $govRootA -File
$govB = Get-ChildItem -LiteralPath $govRootB -File

$govOnlyA = @()
foreach ($item in $govA) {
    $testB = Join-Path -Path $govRootB -ChildPath $item.Name
    if (-not (Test-Path -LiteralPath $testB)) {
        $govOnlyA += $item
    }
}

$govOnlyB = @()
foreach ($item in $govB) {
    $testA = Join-Path -Path $govRootA -ChildPath $item.Name
    if (-not (Test-Path -LiteralPath $testA)) {
        $govOnlyB += $item
    }
}

$govBoth = @()
foreach ($item in $govA) {
    $testB = Join-Path -Path $govRootB -ChildPath $item.Name
    if (Test-Path -LiteralPath $testB) {
        $govBoth += @{A=$item; B=Get-Item -LiteralPath $testB}
    }
}

$report += "Files ONLY in docs/governance/ (A):"
$report += ""
if ($govOnlyA.Count -eq 0) { $report += "  (none)" }
foreach ($item in $govOnlyA) {
    $report += "  $($item.Name)  (size=$($item.Length), modified=$(Get-Date $item.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss'))"
}
$report += ""

$report += "Files ONLY in IDEIA/docs/governance/ (B):"
$report += ""
if ($govOnlyB.Count -eq 0) { $report += "  (none)" }
foreach ($item in $govOnlyB) {
    $report += "  $($item.Name)  (size=$($item.Length), modified=$(Get-Date $item.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss'))"
}
$report += ""

$report += "Files in BOTH governance directories (content comparison):"
$report += ""
if ($govBoth.Count -eq 0) { $report += "  (none)" }
foreach ($pair in $govBoth) {
    $a = $pair.A
    $b = $pair.B
    $sizeMatch = $a.Length -eq $b.Length
    $contentMatch = $false
    if ($sizeMatch) {
        $bytesA = [System.IO.File]::ReadAllBytes($a.FullName) | Select-Object -First 100
        $bytesB = [System.IO.File]::ReadAllBytes($b.FullName) | Select-Object -First 100
        $diff = Compare-Object $bytesA $bytesB
        if (-not $diff) { $contentMatch = $true }
    }
    if ($contentMatch) { $status = "IDENTICAL" }
    elseif ($sizeMatch) { $status = "SAME_SIZE_DIFF_CONTENT" }
    else { $status = "DIFFERENT_SIZE (A=$($a.Length) vs B=$($b.Length))" }
    $report += "  $($a.Name)  A:$($a.Length)  B:$($b.Length)  $status"
}

$report += ""

$report += "=== SUMMARY ==="
$report += ""
$report += "Total files in A (root docs): $($mapA.Count)"
$report += "Total files in B (IDEIA docs): $($mapB.Count)"
$report += ""
$common = 0; $ident = 0; $diff = 0; $missingB = 0
foreach ($rel in $mapA.Keys) {
    if ($mapB.ContainsKey($rel)) { $common++ } else { $missingB++ }
}
$report += "Files with same relative path in both: $common"
$report += "Files only in A (missing from B): $missingB"
$report += "Files only in B (new in IDEIA docs): $($mapB.Count - $common)"

$report -join "`r`n" | Out-File -LiteralPath "F:\PROJETOS\ai-devkit-workspace\FULL_COMPARISON_REPORT.md" -Encoding default
Write-Host "Report saved to FULL_COMPARISON_REPORT.md"
