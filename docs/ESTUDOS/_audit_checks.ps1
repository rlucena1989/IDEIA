$basePath = "F:\PROJETOS\ai-devkit-workspace\IDEIA\docs\ESTUDOS"
$sampleFiles = @(
    "ESTUDO-ANALISE-COMPARATIVA-DEVIN-FACTORY-AGENTES.md",
    "ESTUDO-QUALIDADE-TOTAL-IDEIA.md",
    "ESTUDO-TERMINAL-DEBUG.md",
    "MATRIZ-TECNOLOGICA-COMPLETA.md",
    "VISAO-PRODUTO-IDEIA.md"
)

foreach ($file in $sampleFiles) {
    $fullPath = Join-Path $basePath $file
    if (-not (Test-Path $fullPath)) { Write-Host "SKIP: $file"; continue }
    $content = Get-Content -LiteralPath $fullPath -Raw -Encoding UTF8
    Write-Host "=== $file ==="
    $lines = $content -split "`n"
    Write-Host "Total lines: $($lines.Count)"
    Write-Host "--- First 3 headings ---"
    $lines | Select-String "^#{1,3}\s+" | Select-Object -First 5 | ForEach-Object { Write-Host "  $($_.Line)" }
    $codeCount = @($lines | Select-String "^```").Count
    $roadCount = @($lines | Select-String "(?i)^#{1,3}\s*(Implementaca|Implementação|Roadmap|Implementation|Deploy|Entrega)").Count
    $conexoCount = @($lines | Select-String "(?i)^#{1,3}\s*(Conex[oó]es|Conexões|Conexoes|Integracao|Integração|Cross-References|Dependencias|Dependências)").Count
    $sumarioCount = @($lines | Select-String "(?i)(Sumario|Sumário|Índice|Indice|Table of Contents|TOC)").Count
    Write-Host "Code blocks: $codeCount | Roadmap sections: $roadCount | Conexoes sections: $conexoCount | Sumario: $sumarioCount"
    Write-Host ""
}
