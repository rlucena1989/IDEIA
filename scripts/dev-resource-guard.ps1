param(
    [switch]$Monitor,
    [switch]$Kill,
    [int]$MaxNodeMemoryMB = 4096,
    [int]$MaxBunMemoryMB = 2048,
    [int]$IntervalSec = 5
)

$ErrorActionPreference = "Continue"

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

function Get-ProcessResources {
    param([string]$ProcessName)
    Get-Process -Name $ProcessName -ErrorAction SilentlyContinue |
        Select-Object Id, ProcessName,
            @{N="MemMB";E={[math]::Round($_.WorkingSet64 / 1MB, 1)}},
            @{N="CPUPct";E={[math]::Round($_.CPU, 1)}},
            StartTime
}

function Set-ProcessPriority {
    param([int]$Id, [string]$Priority = "BelowNormal")
    try {
        $process = Get-Process -Id $Id -ErrorAction Stop
        $process.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::$Priority
        Write-Status "  Priority $Priority set for PID $Id" -Color Gray
    } catch {}
}

if (-not $Monitor -and -not $Kill) {
    Write-Host "=== IDEIA Resource Guard ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\scripts\dev-resource-guard.ps1 -Monitor                  # Watch mode"
    Write-Host "  .\scripts\dev-resource-guard.ps1 -Monitor -Kill           # Watch + auto-kill"
    Write-Host "  .\scripts\dev-resource-guard.ps1 -Monitor -IntervalSec 10  # Custom interval"
    Write-Host ""
    Write-Host "Set base priority for Node processes:"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.Id -ne $PID) { Set-ProcessPriority -Id $_.Id -Priority "BelowNormal" }
    }
    Get-Process -Name "bun","bunx" -ErrorAction SilentlyContinue | ForEach-Object {
        Set-ProcessPriority -Id $_.Id -Priority "BelowNormal"
    }
    exit 0
}

Write-Status "=== IDEIA Resource Guard ===" -Color Cyan
Write-Status "Interval: ${IntervalSec}s | Max Node: ${MaxNodeMemoryMB}MB | Max Bun: ${MaxBunMemoryMB}MB" -Color Cyan

if ($Kill) {
    Write-Status "KILL MODE ENABLED" -Color Red
}

while ($Monitor) {
    Clear-Host
    Write-Status "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Color Cyan
    Write-Status ""

    $totalMemMB = 0

    $nodeProcesses = Get-ProcessResources -ProcessName "node"
    foreach ($p in $nodeProcesses) {
        $totalMemMB += $p.MemMB
        $color = if ($p.MemMB -gt $MaxNodeMemoryMB) { "Red" } else { "White" }
        Write-Status "Node PID $($p.Id): $($p.MemMB)MB CPU:$($p.CPUPct)%" -Color $color

        if ($p.MemMB -gt $MaxNodeMemoryMB) {
            if ($Kill) {
                Write-Status "  Killing Node PID $($p.Id) (mem exceeded)" -Color Red
                Stop-Process -Id $p.Id -Force
            } else {
                Write-Status "  EXCEEDED: $($p.MemMB)MB > ${MaxNodeMemoryMB}MB" -Color Red
            }
        }
    }

    $bunProcesses = Get-ProcessResources -ProcessName "bun","bunx"
    foreach ($p in $bunProcesses) {
        $totalMemMB += $p.MemMB
        $color = if ($p.MemMB -gt $MaxBunMemoryMB) { "Red" } else { "White" }
        Write-Status "Bun PID $($p.Id): $($p.MemMB)MB CPU:$($p.CPUPct)%" -Color $color

        if ($p.MemMB -gt $MaxBunMemoryMB) {
            if ($Kill) {
                Write-Status "  Killing Bun PID $($p.Id) (mem exceeded)" -Color Red
                Stop-Process -Id $p.Id -Force
            } else {
                Write-Status "  EXCEEDED: $($p.MemMB)MB > ${MaxBunMemoryMB}MB" -Color Red
            }
        }
    }

    Write-Status ""
    Write-Status "TOTAL: $([math]::Round($totalMemMB))MB" -Color Cyan
    $freeGB = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024, 1)
    Write-Status "SYSTEM FREE: ${freeGB}GB" -Color Cyan

    if ($totalMemMB -gt 30000) {
        Write-Status "CRITICAL: >30GB used" -Color Red
    } elseif ($totalMemMB -gt 20000) {
        Write-Status "WARNING: >20GB used" -Color Yellow
    }

    Start-Sleep -Seconds $IntervalSec
}