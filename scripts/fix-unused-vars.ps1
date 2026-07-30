param(
  [string]$ReportFile = "r3-report.json"
)

$report = Get-Content -Raw $ReportFile | ConvertFrom-Json
$totalFixed = 0

function Remove-ImportName {
  param([string]$Line, [string]$Name)
  # Remove name from import { a, b, c }
  $escaped = [regex]::Escape($Name)
  # Name followed by comma or followed by space and closing brace
  $newLine = $Line -replace "(?<=[\{,]\s*)$escaped(?=\s*[\},])", ''
  $newLine = $newLine -replace ',\s*,', ',' -replace '\{\s*,', '{' -replace ',\s*\}', '}' -replace '\{\s*,\s*\}', '' -replace '\{\s*\}', ''
  if ($newLine -match 'import\s+\{?\s*\}?\s*from') {
    return $null # Remove entire line
  }
  if ($newLine -match 'import\s+type\s+\{?\s*\}?\s*from') {
    return $null
  }
  return $newLine
}

foreach ($file in $report) {
  $errors = $file.messages | Where-Object { $_.ruleId -eq "@typescript-eslint/no-unused-vars" }
  if (-not $errors) { continue }

  $path = $file.filePath
  $origContent = Get-Content -Path $path -Raw
  $content = $origContent
  
  # First pass: handle import removal and unused declarations
  foreach ($err in $errors) {
    if ($err.message -like "*Allowed unused args must match*") { continue }
    
    $name = ($err.message -split "'")[1]
    $lineNum = $err.line
    $lines = $content -split "`r`n|`n"
    if ($lineNum -gt $lines.Length) { continue }
    
    $line = $lines[$lineNum - 1]
    
    # Handle destructured import { a, b as c, type d }
    if ($line -match 'import\s+(?:type\s+)?\{[^}]+\}\s+from') {
      $result = Remove-ImportName -Line $line -Name $name
      if ($result -eq $null) {
        $content = $content -replace ([regex]::Escape($line) + "`r?`n"), ''
      } elseif ($result -ne $line) {
        $content = $content -replace [regex]::Escape($line), $result
      }
      continue
    }
    
    # Handle import * as X from
    if ($line -match "import\s+\*\s+as\s+$([regex]::Escape($name))\s+from") {
      $content = $content -replace ([regex]::Escape($line) + "`r?`n"), ''
      continue
    }
    
    # Handle default import
    if ($line -match "import\s+$([regex]::Escape($name))\s+from") {
      $content = $content -replace ([regex]::Escape($line) + "`r?`n"), ''
      continue
    }
    
    # Handle function declaration removal
    if ($line.Trim() -match "^function\s+$([regex]::Escape($name))\s*\(") {
      # Simple removal: just remove the function declaration line
      $content = $content -replace ([regex]::Escape($line) + "`r?`n"), ''
      continue
    }
    
    # Handle const/let/var declaration removal
    if ($line.Trim() -match "^(const|let|var)\s+$([regex]::Escape($name))\s*=") {
      $content = $content -replace ([regex]::Escape($line) + "`r?`n"), ''
      continue
    }
  }
  
  # Second pass: handle unused args (prefix with _)
  foreach ($err in $errors) {
    if ($err.message -notlike "*Allowed unused args must match*") { continue }
    
    $name = ($err.message -split "'")[1]
    $lineNum = $err.line
    $colNum = $err.column
    $lines = $content -split "`r`n|`n"
    if ($lineNum -gt $lines.Length) { continue }
    
    $line = $lines[$lineNum - 1]
    
    # Check the actual character at the column
    if ($line.Length -ge $colNum -and $line.Substring($colNum - 1, [Math]::Min($name.Length, $line.Length - $colNum + 1)) -eq $name) {
      $newLine = $line.Substring(0, $colNum - 1) + "_" + $line.Substring($colNum - 1)
      $content = $content -replace [regex]::Escape($line), $newLine
    }
  }
  
  if ($content -ne $origContent) {
    Set-Content -Path $path -Value $content -NoNewline
    $totalFixed++
    Write-Host "Fixed: $path"
  }
}

Write-Host "`nTotal files modified: $totalFixed"
