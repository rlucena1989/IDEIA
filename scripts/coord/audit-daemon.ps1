# Audit Daemon — Monitor contínuo de integridade documental
# Roda em background e verifica periodicamente se docs refletem o código
# Uso: .\scripts\audit-daemon.ps1 [-Interval 300] [-Daemon]

param([int]$Interval = 300, [switch]$Daemon)

$root = Resolve-Path "$PSScriptRoot/.."
$logFile = Join-Path $root ".ai\audit\audit-daemon.log"
$reportDir = Join-Path $root ".ai\audit\reports"

# Ensure dirs exist
$null = New-Item -ItemType Directory -Path (Split-Path $logFile -Parent) -Force
$null = New-Item -ItemType Directory -Path $reportDir -Force

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    Add-Content -Path $logFile -Value $line
    if (-not $Daemon) { Write-Host $line }
}

function Run-Audit {
    Write-Log "Starting audit cycle..." -Level "AUDIT"
    
    # 1. Reality check
    $result = & "$PSScriptRoot\reality-check.ps1" -Packages -Endpoints 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Log "Reality check PASSED" -Level "PASS"
    } else {
        Write-Log "Reality check FAILED (exit: $exitCode)" -Level "FAIL"
    }
    
    # 2. Check manifest age
    $manifestPath = Join-Path $root "docs\governance\REALITY-MANIFEST.md"
    if (Test-Path $manifestPath) {
        $ageHours = [math]::Round(((Get-Date) - (Get-Item $manifestPath).LastWriteTime).TotalHours, 1)
        if ($ageHours -gt 24) {
            Write-Log "Manifest stale: $ageHours hours old" -Level "WARN"
        }
    }
    
    # 3. Generate report
    $pkgCount = (Get-ChildItem (Join-Path $root "IDEIA\packages") -Directory).Count
    $report = @{
        timestamp = (Get-Date -Format "o")
        realityCheckExitCode = $exitCode
        manifestAgeHours = if (Test-Path $manifestPath) { $ageHours } else { $null }
        packages = $pkgCount
    }
    $reportPath = Join-Path $reportDir "audit-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $report | ConvertTo-Json | Set-Content -Path $reportPath
    
    Write-Log "Audit cycle complete. Report: $reportPath" -Level "AUDIT"
}

Write-Log "=== Audit Daemon Started ==="
Write-Log "Interval: ${Interval}s | Log: $logFile | Reports: $reportDir"
Write-Log ""

if ($Daemon) {
    Write-Log "Running in daemon mode"
    while ($true) {
        Run-Audit
        Start-Sleep -Seconds $Interval
    }
} else {
    Run-Audit
    Write-Log ""
    Write-Log "Run with -Daemon for continuous monitoring" -Level "INFO"
    Write-Log "Example: .\scripts\audit-daemon.ps1 -Daemon -Interval 600" -Level "INFO"
}
