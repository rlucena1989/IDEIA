param(
    [int]$NodeMemLimitMB = 2048,
    [int]$BunMemLimitMB = 1024,
    [switch]$DryRun
)

$ErrorActionPreference = "Continue"

Write-Host "=== Kill Heavy Processes ===" -ForegroundColor Red
$killed = @()

function Kill-ProcessIfExceeds {
    param([string]$Name, [int]$LimitMB)
    Get-Process -Name $Name -ErrorAction SilentlyContinue | ForEach-Object {
        $memMB = [math]::Round($_.WorkingSet64 / 1MB)
        if ($memMB -gt $LimitMB) {
            $msg = "PID $($_.Id) ($Name): ${memMB}MB > ${LimitMB}MB"
            if ($DryRun) {
                Write-Host "[DRY-RUN] Would kill $msg" -ForegroundColor Yellow
            } else {
                Write-Host "Killing $msg" -ForegroundColor Red
                Stop-Process -Id $_.Id -Force
                $script:killed += $msg
            }
        }
    }
}

# Kill Node processes exceeding limit
Kill-ProcessIfExceeds -Name "node" -LimitMB $NodeMemLimitMB

# Kill Bun processes exceeding limit
Kill-ProcessIfExceeds -Name "bun" -LimitMB $BunMemLimitMB
Kill-ProcessIfExceeds -Name "bunx" -LimitMB $BunMemLimitMB

# Kill processes stuck for >30 min (CPU < 5, running long)
$deadline = (Get-Date).AddMinutes(-30)
Get-Process -Name "node","bun","bunx" -ErrorAction SilentlyContinue | Where-Object {
    $_.StartTime -lt $deadline -and $_.CPU -lt 5
} | ForEach-Object {
    $memMB = [math]::Round($_.WorkingSet64 / 1MB)
    $msg = "PID $($_.Id) ($($_.ProcessName)): stuck since $($_.StartTime), ${memMB}MB"
    if ($DryRun) {
        Write-Host "[DRY-RUN] Would kill $msg" -ForegroundColor Yellow
    } else {
        Write-Host "Killing $msg" -ForegroundColor Red
        Stop-Process -Id $_.Id -Force
        $script:killed += $msg
    }
}

# Clean V8 temp files
$v8Temp = Get-ChildItem -Path "$env:TEMP\*-v8-*","$env:TEMP\*v8compile*" -ErrorAction SilentlyContinue
if ($v8Temp) {
    $size = [math]::Round(($v8Temp | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
    if ($DryRun) {
        Write-Host "[DRY-RUN] Would clean ${size}MB of V8 temp files" -ForegroundColor Yellow
    } else {
        $v8Temp | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned ${size}MB of V8 temp files" -ForegroundColor Green
    }
}

Write-Host ""
if ($killed.Count -gt 0) {
    Write-Host "Killed $($killed.Count) process(es)" -ForegroundColor Red
    $killed | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "No processes needed killing" -ForegroundColor Green
}