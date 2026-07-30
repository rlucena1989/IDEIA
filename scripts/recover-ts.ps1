param([string]$Path = ".")

$files = @(
  "packages/self-chat-protocol/src/knowledge-indexer.ts",
  "packages/config-engine/src/config-history.ts",
  "packages/initiative-feedback/src/feedback-store.ts"
)

foreach ($relPath in $files) {
  $fullPath = Join-Path $Path $relPath
  if (-not (Test-Path $fullPath)) { Write-Host "SKIP $relPath"; continue }

  $raw = Get-Content -Path $fullPath -Raw
  if ($raw.Length -eq 0) { Write-Host "EMPTY $relPath"; continue }

  # Strategy: insert newlines at known statement boundaries
  # 1) Before keywords that start new statements
  $keywords = @(
    'import ', 'export ', 'interface ', 'type ', 'const ', 'let ', 'var ',
    'function ', 'class ', 'enum ',
    'async ', 'public ', 'private ', 'protected ', 'static ', 'readonly ',
    'if ', 'else ', 'for ', 'while ', 'do ', 'switch ', 'case ', 'return ', 'throw ',
    'try ', 'catch ', 'finally ',
    'get ', 'set '
  )

  $text = $raw
  
  # Add newline after semicolons followed by keyword/identifier
  # Pattern: ; followed by non-whitespace (which means code continues on same line)
  $text = $text -replace '(;\s*)(\S)', "`$1`r`n`$2"
  
  # Add newline after closing braces followed by code
  $text = $text -replace '(\}\s*)(\S)', "`$1`r`n`$2"

  # Add newline before opening braces for class/func/if/for/etc
  # But only when brace is preceded by )
  $text = $text -replace '(\)\s*\{)', "`$1`r`n"

  # Clean up: remove lines that are just whitespace
  $resultLines = $text -split '\r?\n'
  $resultLines = $resultLines | ForEach-Object { $_.TrimEnd() }
  # Keep non-empty lines and lines that are just { or }
  $resultLines = $resultLines | Where-Object { $_ -ne '' }

  $resultLines -join "`r`n" | Set-Content -Path $fullPath -Force
  Write-Host "RECOVERED $relPath ($($resultLines.Count) lines)"
}

Write-Host "Done."
