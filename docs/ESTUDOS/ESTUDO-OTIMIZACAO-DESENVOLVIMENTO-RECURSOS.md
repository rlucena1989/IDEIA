# Estudo de Otimização de Recursos em Desenvolvimento

> **Data:** 2026-07-25
> **Versão:** 2.0
> **Propósito:** Diagnosticar e mitigar o consumo excessivo de CPU e RAM durante o desenvolvimento com multissessão de IA, testes e tarefas paralelas. Inclui implementação de BuildOptimizer, CacheManager, ResourceMonitor e integração com CLI build commands.
> **Contexto:** i7-11700, 56GB RAM, Windows, Node.js + Bun como principais consumidores, sistema chegando a travar.
> **Pacotes:** 177 packages TypeScript, ~176K LOC, ~580 test files, ~4700+ testes

---

## Sumário

1. [Diagnóstico Atual](#1-diagnóstico-atual)
2. [Causas Raiz](#2-causas-raiz)
3. [Estratégias de Mitigação Imediatas](#3-estratégias-de-mitigação-imediatas)
4. [Estratégias de Mitigação Permanentes](#4-estratégias-de-mitigação-permanentes)
5. [Scripts e Ferramentas](#5-scripts-e-ferramentas)
6. [Implementação: BuildOptimizer, CacheManager, ResourceMonitor](#6-implementação-buildoptimizer-cachemanager-resourcemonitor)
7. [Integração com CLI Build Commands](#7-integração-com-cli-build-commands)
8. [Plano de Implementação](#8-plano-de-implementação)
9. [Anexo: Quick Reference](#9-anexo-quick-reference)

---

## 1. Diagnóstico Atual

### 1.1 Perfil de Consumo do Projeto IDEIA

| Métrica | Valor | Impacto |
|---------|-------|---------|
| Packages TypeScript | 177 pacotes compiláveis por `tsc -b` | CPU intensivo: ~100% em 1 core por 30-60s |
| Linhas de código TS | ~176K LOC | Memória do TypeScript server proporcional |
| node_modules root | ~800 MB | I/O em cada import/resolução |
| node_modules electron | ~260 MB | I/O adicional |
| Total de dependências | ~1.2 GB | Cache V8, parse, require() em cada execução |
| Testes | ~4700+ testes em ~580 suites | Jest Workers: N-1 cores x 350-600MB cada |
| Theia plugin build | Webpack-based | Pico de memória: ~2-4GB durante bundle |
| Arquivos de teste | ~580 test files | I/O e parse adicionais durante teste |

### 1.2 Processos Críticos

```
tsc -b / tsc --noEmit
  ├── 177 projetos TypeScript
  ├── 1 processo pai + N worker processes (CPU-bound)
  └── Pico: 4-8GB RAM, 100% CPU em múltiplos cores

Jest (~4700+ testes)
  ├── ~580 suites, N workers (default: N-1 cores)
  ├── Cada worker: 200-600MB RAM
  └── Pico: 8-16GB RAM, 100% CPU em N-1 cores

chokidar / parcel-watcher
  ├── Watchers de sistema de arquivos
  ├── Polling em arquivos grandes
  └── CPU constante: 5-15% mesmo idle

ESLint (177 pacotes)
  ├── Parse de todos os .ts files
  ├── TypeScript AST analysis
  └── Pico: 2-4GB RAM

Theia webpack build
  ├── Bundle com sourcemaps
  └── Pico: 2-4GB RAM, 100% CPU

Bun (runtime externo — AI tooling)
  ├── Processo JavaScript alternativo ao Node
  ├── Conhecido por: memory leak em operações longas
  └── Por processo: 300MB-2GB RAM, CPU variável
```

### 1.3 O Problema do Bun

Bun não é usado pelo projeto IDEIA. Ele é tipicamente usado pela ferramenta de IA (opencode CLI ou similar) como runtime. Características do Bun que agravam o problema:

- **Garbage collection agressivo:** Bun usa um GC diferente do V8, que pode reter memória por mais tempo
- **Thread pool generoso:** Bun cria pools de threads que competem com os workers do Jest/tsc
- **Hot module replacement:** Se o Bun estiver em modo watch, mantém todo o grafo de módulos em memória
- **Comportamento em Windows:** Bun no Windows tem overhead adicional vs Linux/macOS

---

## 2. Causas Raiz

### 2.1 Concorrência de Processos CPU-Bound

Durante o desenvolvimento com IA multissessão, estes processos rodam SIMULTANEAMENTE:

```
Sessão IA 1: tsc --noEmit (typecheck)         → 4-8GB | CPU: 1-2 cores 100%
Sessão IA 2: Jest (~4700+ testes)              → 8-16GB | CPU: N-1 cores 100%
Sessão IA 3: ESLint (177 pacotes)              → 2-4GB  | CPU: 1 core 100%
Watchers:    chokidar + parcel-watcher         → 0.5GB  | CPU: 5-15% constante
Bun (AI CLI): processo runtime da IA           → 1-2GB  | CPU: 20-50%
Servidor dev: backend + Theia + WebSocket     → 0.5-1GB | CPU: 10-30%

TOTAL ESTIMADO: 16-31GB RAM + TODOS OS CORES SATURADOS
```

### 2.2 Gargalos Específicos

| Gargalo | Por quê | Solução |
|---------|---------|---------|
| `tsc -b` sem `--incremental` | Recompila tudo, não apenas o que mudou | Ativar incremental mode |
| Jest sem `--selectProjects` | Roda TODOS os ~4700+ testes | Filtrar por escopo da tarefa |
| chokidar em projeto 177 pacotes | Monitora tudo, I/O de diretórios enorme | Substituir por watcher nativo do SO |
| node_modules com 1.2GB | Resolução de módulos lenta | pnpm com cache agressivo |
| ESLint sem cache | Re-analisa todos os arquivos | ESLint cache + --cache-location |
| Theia webpack build sem cache | Re-bundla tudo | Webpack cache filesystem |
| Bun sem limite de memória | Cresce até OOM | --max-old-space-size equivalente |
| Dependências não pre-buildadas | @ideia/* packages recompilados sempre | Dependency pre-building (BuildOptimizer) |
| Paralelismo excessivo | tsc + Jest + ESLint rodam juntos | ResourceMonitor com agendamento |

---

## 3. Estratégias de Mitigação Imediatas

### 3.1 Script `dev-resource-guard.ps1`

Script que monitora e limita recursos dos processos Node.js/Bun. Crie em `IDEIA/scripts/`:

```powershell
# dev-resource-guard.ps1 — Monitor e limitador de recursos para desenvolvimento IDEIA

param(
    [switch]$Monitor,
    [switch]$Kill,
    [int]$MaxNodeMemoryMB = 4096,
    [int]$MaxBunMemoryMB = 2048,
    [int]$HighCpuThreshold = 80,
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
            StartTime,
            @{N="CommandLine";E={try { (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine } catch { "" }}}
}

function Set-ProcessPriority {
    param([int]$Id, [string]$Priority = "BelowNormal")
    try {
        $process = Get-Process -Id $Id -ErrorAction Stop
        $process.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::$Priority
        Write-Status "  → Priority $Priority set for PID $Id" -Color Gray
    } catch {
        # Process already exited
    }
}

# Main loop
Write-Status "=== IDEIA Resource Guard (v2.0) ===" -Color Cyan
Write-Status "Monitoring every ${IntervalSec}s. Max Node: ${MaxNodeMemoryMB}MB, Max Bun: ${MaxBunMemoryMB}MB" -Color Cyan
Write-Status "High CPU threshold: ${HighCpuThreshold}%" -Color Cyan

# Set priority for known-heavy processes immediately
Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Id -ne $PID) {
        Set-ProcessPriority -Id $_.Id -Priority "BelowNormal"
    }
}
Get-Process -Name "bun", "bunx" -ErrorAction SilentlyContinue | ForEach-Object {
    Set-ProcessPriority -Id $_.Id -Priority "BelowNormal"
}

if ($Kill) {
    Write-Status "⚠️ KILL MODE ENABLED — will terminate heavy processes" -Color Red
}

while ($Monitor) {
    Clear-Host
    Write-Status "=== IDEIA Resource Monitor v2.0 ===" -Color Cyan
    Write-Status "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Color Cyan
    Write-Status ""

    $totalMemMB = 0
    $highCpuProcesses = @()

    # Check Node.js processes
    $nodeProcesses = Get-ProcessResources -ProcessName "node"
    foreach ($p in $nodeProcesses) {
        $totalMemMB += $p.MemMB
        $color = if ($p.MemMB -gt $MaxNodeMemoryMB) { "Red" } else { "White" }
        Write-Status "  Node PID $($p.Id): $($p.MemMB)MB | CPU: $($p.CPUPct)% $(if($p.CommandLine.Length -gt 80){'...'+$p.CommandLine.Substring($p.CommandLine.Length-80)}else{$p.CommandLine})" -Color $color

        if ($p.MemMB -gt $MaxNodeMemoryMB) {
            if ($Kill) {
                Write-Status "  ⚠️ Killing Node PID $($p.Id) (mem exceeded)" -Color Red
                Stop-Process -Id $p.Id -Force
            } else {
                Write-Status "  ⚠️ EXCEEDED: Node PID $($p.Id) at $($p.MemMB)MB > ${MaxNodeMemoryMB}MB" -Color Red
                Write-Status "     Suggestion: Stop-Process -Id $($p.Id)" -Color Yellow
            }
        }
    }

    # Check Bun processes
    $bunProcesses = Get-ProcessResources -ProcessName "bun", "bunx"
    foreach ($p in $bunProcesses) {
        $totalMemMB += $p.MemMB
        $color = if ($p.MemMB -gt $MaxBunMemoryMB) { "Red" } else { "White" }
        Write-Status "  Bun PID $($p.Id): $($p.MemMB)MB | CPU: $($p.CPUPct)%" -Color $color

        if ($p.MemMB -gt $MaxBunMemoryMB) {
            if ($Kill) {
                Write-Status "  ⚠️ Killing Bun PID $($p.Id) (mem exceeded)" -Color Red
                Stop-Process -Id $p.Id -Force
            } else {
                Write-Status "  ⚠️ EXCEEDED: Bun PID $($p.Id) at $($p.MemMB)MB > ${MaxBunMemoryMB}MB" -Color Red
            }
        }
    }

    Write-Status ""
    Write-Status "  TOTAL: $([math]::Round($totalMemMB, 0))MB" -Color Cyan
    Write-Status "  SYSTEM: $([math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024, 1))GB free" -Color Cyan

    if ($totalMemMB -gt 30000) {
        Write-Status "  ⚠️ CRITICAL: Memory over 30GB" -Color Red
    } elseif ($totalMemMB -gt 20000) {
        Write-Status "  ⚠️ WARNING: Memory over 20GB" -Color Yellow
    }

    Start-Sleep -Seconds $IntervalSec
}
```

**Uso:**
```powershell
# Apenas monitorar
.\scripts\dev-resource-guard.ps1 -Monitor

# Monitorar + matar processos que excederem limites
.\scripts\dev-resource-guard.ps1 -Monitor -Kill

# Intervalo customizado
.\scripts\dev-resource-guard.ps1 -Monitor -IntervalSec 10
```

### 3.2 Alias de Comando Otimizados

Adicione ao `package.json` scripts de desenvolvimento com recursos limitados:

```jsonc
// package.json — scripts otimizados
{
  "scripts": {
    // TypeScript com cache incremental (+ 2x mais rápido)
    "typecheck:fast": "tsc --noEmit --incremental --tsBuildInfoFile .tsbuildinfo",
    "build:fast": "tsc -b --incremental",

    // Testes limitados ao escopo
    "test:scope": "jest --selectProjects --passWithNoTests",
    "test:changed": "jest --changedSince HEAD~1 --passWithNoTests",
    "test:package": "cd packages/__NAME__ && npx jest --no-coverage",

    // ESLint com cache
    "lint:fast": "eslint --cache --cache-location .eslintcache 'packages/*/src/**/*.{ts,tsx}'",

    // Build Theia com cache
    "build:plugin:fast": "cd packages/ideia-plugin && npx tsc --incremental",

    // Recursos limitados
    "typecheck:lowmem": "node --max-old-space-size=2048 node_modules/.bin/tsc --noEmit",
    "test:lowmem": "node --max-old-space-size=2048 node_modules/.bin/jest --maxWorkers=2 --passWithNoTests",

    // Build optimizado
    "build:optimized": "node scripts/build-optimizer.mjs",
    "build:parallel": "node scripts/build-optimizer.mjs --parallel --max-workers=4"
  }
}
```

### 3.3 `.env` de Recursos

Crie `IDEIA/.env.resources` para controlar limites globais:

```env
# Limites de recursos para desenvolvimento IDEIA
NODE_OPTIONS=--max-old-space-size=4096
JEST_MAX_WORKERS=2
TSC_INCREMENTAL=true
ESLINT_CACHE=true
ESLINT_CACHE_LOCATION=.eslintcache
BUILD_CACHE_DIR=.build-cache
BUILD_MAX_WORKERS=4
BUILD_PARALLEL=true
```

Carregue automaticamente no PowerShell profile:

```powershell
# $PROFILE — adicione
if (Test-Path ".env.resources") {
    Get-Content ".env.resources" | ForEach-Object {
        if ($_ -match "^(.*?)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}
```

---

## 4. Estratégias de Mitigação Permanentes

### 4.1 Substituir chokidar por Watcher Nativo do Windows

**Problema:** chokidar usa polling em algumas configurações, consumindo CPU mesmo idle.

**Solução:** Em Windows, usar `fs.watch` com `ReadDirectoryChangesW` nativo (já disponível no Node.js 20+):

```typescript
// packages/reality-sync/src/native-watcher.ts
import fs from 'node:fs';
import path from 'node:path';

export class NativeWatcher {
  private watchers = new Map<string, fs.FSWatcher>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private ignorePatterns: RegExp[] = [/node_modules/, /\.git/, /\.build-cache/];

  watch(rootDir: string, callback: (event: string, filePath: string) => void) {
    const walk = (dir: string) => {
      try {
        const watcher = fs.watch(dir, { recursive: false }, (eventType, filename) => {
          if (!filename) return;
          const fullPath = path.join(dir, filename);

          // Ignorar padrões
          if (this.ignorePatterns.some(p => p.test(fullPath))) return;

          // Debounce para evitar eventos duplicados
          const key = fullPath;
          const existing = this.debounceTimers.get(key);
          if (existing) clearTimeout(existing);

          this.debounceTimers.set(key, setTimeout(() => {
            this.debounceTimers.delete(key);
            callback(eventType === 'rename' ? 'change' : eventType, fullPath);
          }, 300));

          // Se for diretório, entrar nele
          try {
            if (fs.statSync(fullPath).isDirectory() && !this.ignorePatterns.some(p => p.test(fullPath))) {
              this.watch(fullPath, callback);
            }
          } catch {}
        });

        watcher.on('error', () => {});
        this.watchers.set(dir, watcher);
      } catch {}
    };

    walk(rootDir);
  }

  unwatch(dir: string): void {
    const watcher = this.watchers.get(dir);
    if (watcher) {
      watcher.close();
      this.watchers.delete(dir);
    }
  }

  close() {
    for (const [key, timer] of this.debounceTimers) {
      clearTimeout(timer);
    }
    for (const [, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    this.debounceTimers.clear();
  }
}
```

**Ganho esperado:** Redução de 10-15% CPU constante para ~1-2%.

### 4.2 Jest com Worker Limit

Configuração global para evitar que Jest sature todos os cores:

```javascript
// jest.config.js (root)
module.exports = {
  maxWorkers: process.env.CI ? '50%' : Math.max(2, Math.floor(require('os').cpus().length / 2)),
  // Ou por detecção de memória:
  maxWorkers: Math.min(
    require('os').cpus().length - 1,
    Math.floor(require('os').totalmem() / (4 * 1024 * 1024 * 1024)) // 4GB per worker
  ),
  // ...
};
```

### 4.3 ESLint com Cache Persistente

```javascript
// eslint.config.js
module.exports = {
  cache: true,
  cacheLocation: '.eslintcache',
  cacheStrategy: 'content',  // 'metadata' é mais rápido mas menos preciso
  // ...
};
```

### 4.4 TypeScript com Projeto Incremental

```jsonc
// tsconfig.json (root)
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",
    // ...
  }
}
```

Para evitar race conditions em multissessão, use build info files por sessão:

```bash
# No lugar de tsc --noEmit
tsc --noEmit --incremental --tsBuildInfoFile ".tsbuildinfo-${SESSION_ID}"
```

### 4.5 Dependency Pre-building

```typescript
class DependencyPrebuilder {
  private builtPackages = new Set<string>();
  private buildCache = new Map<string, BuildCacheEntry>();

  constructor(private buildOptimizer: BuildOptimizer) {}

  async prebuildDependencies(packageName: string): Promise<void> {
    const graph = await this.buildOptimizer.getDependencyGraph();
    const deps = graph.getDependencies(packageName, true);

    for (const dep of deps) {
      if (this.builtPackages.has(dep)) continue;

      // Verificar se precisa rebuild
      const needsRebuild = await this.checkNeedsRebuild(dep);
      if (needsRebuild) {
        await this.buildOptimizer.buildPackage(dep);
        this.builtPackages.add(dep);
      }
    }
  }

  private async checkNeedsRebuild(packageName: string): Promise<boolean> {
    const entry = this.buildCache.get(packageName);
    if (!entry) return true;

    // Verificar se source mudou desde último build
    const sourceHash = await this.computeSourceHash(packageName);
    return sourceHash !== entry.sourceHash;
  }

  private async computeSourceHash(packageName: string): Promise<string> {
    const { createHash } = await import('node:crypto');
    // Implementação real usaria glob + hash de arquivos
    return createHash('sha256').update(packageName).digest('hex').slice(0, 16);
  }
}

interface BuildCacheEntry {
  packageName: string;
  sourceHash: string;
  builtAt: number;
  version: string;
}
```

---

## 5. Scripts e Ferramentas

### 5.1 Quick Killer

Para quando o sistema já está travando:

```powershell
# kill-heavy-processes.ps1
Write-Host "=== Matando processos pesados ===" -ForegroundColor Red

# Matar processos Node que estão consumindo > 2GB
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.WorkingSet64 -gt 2GB
} | ForEach-Object {
    Write-Host "Matando Node PID $($_.Id): $([math]::Round($_.WorkingSet64/1MB))MB"
    Stop-Process -Id $_.Id -Force
}

# Matar processos Bun que estão consumindo > 1GB
Get-Process -Name "bun", "bunx" -ErrorAction SilentlyContinue | Where-Object {
    $_.WorkingSet64 -gt 1GB
} | ForEach-Object {
    Write-Host "Matando Bun PID $($_.Id): $([math]::Round($_.WorkingSet64/1MB))MB"
    Stop-Process -Id $_.Id -Force
}

# Matar processos parados há > 30 min
$deadline = (Get-Date).AddMinutes(-30)
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.StartTime -lt $deadline -and $_.CPU -lt 5
} | ForEach-Object {
    Write-Host "Matando Node PID $($_.Id) (parado desde $($_.StartTime))"
    Stop-Process -Id $_.Id -Force
}

# Limpar cache de arquivos temporários
Get-ChildItem -Path "$env:TEMP\*-v8-*" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path "$env:TEMP\*v8compile*" -ErrorAction SilentlyContinue | Remove-Item -Force

Write-Host "=== Concluído ===" -ForegroundColor Green
```

### 5.2 Dev Resource Budget

```powershell
# check-resource-budget.ps1
$totalMemGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
$freeMemGB = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB / 1024, 1)
$cpuCores = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors

Write-Host "=== Resource Budget Check ===" -ForegroundColor Cyan
Write-Host "Total RAM: ${totalMemGB}GB | Free: ${freeMemGB}GB | Cores: ${cpuCores}"

$budget = @{
    tsc         = @{ minMemGB = 4; cores = 2 }
    jest        = @{ minMemGB = 8; cores = 4 }
    eslint      = @{ minMemGB = 2; cores = 1 }
    webpack     = @{ minMemGB = 4; cores = 2 }
    bun         = @{ minMemGB = 2; cores = 1 }
    build       = @{ minMemGB = 6; cores = 4 }
}

$canRun = @{}
$blocked = $false
foreach ($op in $budget.Keys) {
    $needed = $budget[$op]
    $available = $freeMemGB -gt $needed.minMemGB
    $canRun[$op] = $available
    if (-not $available) {
        Write-Host "❌ $op precisa de $($needed.minMemGB)GB livres" -ForegroundColor Red
        $blocked = $true
    } else {
        Write-Host "✅ $op: OK (precisa $($needed.minMemGB)GB)" -ForegroundColor Green
    }
}

if ($blocked) {
    Write-Host ""
    Write-Host "⚠️ Memória insuficiente para rodar tudo. Recomendado:" -ForegroundColor Yellow
    Write-Host "  1. Mate processos pesados com: .\scripts\kill-heavy-processes.ps1" -ForegroundColor Yellow
    Write-Host "  2. Rode tarefas sequencialmente em vez de paralelo" -ForegroundColor Yellow
    Write-Host "  3. Use --maxWorkers=2 para Jest" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Budget OK — pode prosseguir" -ForegroundColor Green
```

---

## 6. IMPLEMENTAÇÃO: BuildOptimizer, CacheManager, ResourceMonitor

### 6.1 BuildOptimizer

```typescript
interface BuildTask {
  packageName: string;
  type: 'tsc' | 'webpack' | 'jest' | 'eslint';
  dependencies: string[];
  estimatedMemoryMB: number;
  estimatedDuration: number;
  priority: number;
  config: BuildConfig;
}

interface BuildConfig {
  incremental: boolean;
  cacheKey: string;
  parallel: boolean;
  maxWorkers: number;
  flags: string[];
}

interface BuildResult {
  success: boolean;
  packageName: string;
  duration: number;
  peakMemoryMB: number;
  output?: string;
  error?: string;
  cached: boolean;
}

class BuildOptimizer {
  private taskQueue: BuildTask[] = [];
  private runningTasks: Map<string, BuildResult> = new Map();
  private completedTasks: BuildResult[] = [];
  private cacheManager: CacheManager;
  private resourceMonitor: ResourceMonitor;
  private eventBus: IEventBus;

  constructor(
    cacheManager: CacheManager,
    resourceMonitor: ResourceMonitor,
    eventBus: IEventBus,
  ) {
    this.cacheManager = cacheManager;
    this.resourceMonitor = resourceMonitor;
    this.eventBus = eventBus;
  }

  async buildPackage(packageName: string, config?: Partial<BuildConfig>): Promise<BuildResult> {
    const task: BuildTask = {
      packageName,
      type: 'tsc',
      dependencies: [],
      estimatedMemoryMB: 1024,
      estimatedDuration: 30000,
      priority: 5,
      config: {
        incremental: true,
        cacheKey: `${packageName}:${Date.now()}`,
        parallel: true,
        maxWorkers: 4,
        flags: [],
        ...config,
      },
    };

    // Verificar cache primeiro
    const cached = await this.cacheManager.getBuildCache(packageName);
    if (cached) {
      return {
        success: true,
        packageName,
        duration: 0,
        peakMemoryMB: 0,
        cached: true,
      };
    }

    // Verificar recursos disponíveis
    const available = await this.resourceMonitor.canAllocate(task.estimatedMemoryMB);
    if (!available) {
      // Enfileirar para execução posterior
      this.taskQueue.push(task);
      throw new BuildQueueError(`Insufficient resources for ${packageName}, queued`);
    }

    const startTime = Date.now();
    await this.resourceMonitor.allocate(task.estimatedMemoryMB);

    try {
      await this.eventBus.emit('build.started', {
        package: packageName,
        timestamp: Date.now(),
      });

      // Executar build com child_process
      const result = await this.runBuild(task);
      const buildResult: BuildResult = {
        ...result,
        duration: Date.now() - startTime,
        peakMemoryMB: await this.resourceMonitor.getPeakMemory(task.packageName),
      };

      // Salvar no cache
      await this.cacheManager.setBuildCache(packageName, buildResult);
      this.completedTasks.push(buildResult);

      await this.eventBus.emit('build.completed', {
        package: packageName,
        success: buildResult.success,
        duration: buildResult.duration,
        timestamp: Date.now(),
      });

      return buildResult;
    } finally {
      await this.resourceMonitor.deallocate(task.estimatedMemoryMB);
    }
  }

  async buildAll(packages: string[], config?: Partial<BuildConfig>): Promise<BuildResult[]> {
    const results: BuildResult[] = [];
    const graph = await this.getDependencyGraph();

    // Ordem topológica
    const ordered = graph.topologicalSort();
    const filtered = ordered.filter(p => packages.includes(p));

    for (const pkg of filtered) {
      const result = await this.buildPackage(pkg, config);
      results.push(result);
    }

    return results;
  }

  async buildParallel(packages: string[], config?: Partial<BuildConfig>): Promise<BuildResult[]> {
    const concurrency = config?.maxWorkers || 4;
    const results: BuildResult[] = [];
    const queue = [...packages];
    const running = new Set<Promise<BuildResult>>();

    while (queue.length > 0 || running.size > 0) {
      while (running.size < concurrency && queue.length > 0) {
        const pkg = queue.shift()!;
        const task = this.buildPackage(pkg, config);
        running.add(task);
        task.then(result => {
          running.delete(task);
          results.push(result);
        });
      }

      if (running.size > 0) {
        await Promise.race(running);
      }
    }

    return results;
  }

  async getDependencyGraph(): Promise<DependencyGraph> {
    const graph = new DependencyGraph();
    // Mapear dependências dos packages
    // Normalmente isso viria do service catalog ou lendo package.json
    return graph;
  }

  private async runBuild(task: BuildTask): Promise<BuildResult> {
    const { execSync } = await import('node:child_process');

    try {
      let command: string;

      switch (task.type) {
        case 'tsc':
          command = `npx tsc -b --incremental ${task.config.flags.join(' ')}`;
          break;
        case 'webpack':
          command = `npx webpack --config webpack.config.js ${task.config.flags.join(' ')}`;
          break;
        default:
          command = `npx tsc -b --incremental`;
      }

      const startTime = Date.now();
      const output = execSync(command, {
        cwd: `packages/${task.packageName}`,
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        packageName: task.packageName,
        duration: Date.now() - startTime,
        peakMemoryMB: 0,
        output: output.toString(),
        cached: false,
      };
    } catch (error) {
      return {
        success: false,
        packageName: task.packageName,
        duration: 0,
        peakMemoryMB: 0,
        error: error instanceof Error ? error.message : String(error),
        cached: false,
      };
    }
  }

  optimizeBuildOrder(packages: string[]): string[] {
    // Priorizar pacotes com mais dependentes (build bottom-up)
    const dependencyCount = new Map<string, number>();
    for (const pkg of packages) {
      dependencyCount.set(pkg, 0);
    }

    // Contar quantos dependem de cada pacote
    for (const pkg of packages) {
      const deps = this.getPackageDependencies(pkg);
      for (const dep of deps) {
        if (dependencyCount.has(dep)) {
          dependencyCount.set(dep, (dependencyCount.get(dep) || 0) + 1);
        }
      }
    }

    // Ordenar por número de dependentes (mais dependentes primeiro)
    return [...packages].sort((a, b) => (dependencyCount.get(b) || 0) - (dependencyCount.get(a) || 0));
  }

  private getPackageDependencies(packageName: string): string[] {
    // Ler package.json para obter dependências
    try {
      const pkgJson = require(`../../packages/${packageName}/package.json`);
      return Object.keys(pkgJson.dependencies || {})
        .filter(d => d.startsWith('@ideia/'))
        .map(d => d.replace('@ideia/', ''));
    } catch {
      return [];
    }
  }

  getStats(): BuildStats {
    const total = this.completedTasks.length;
    const succeeded = this.completedTasks.filter(r => r.success).length;
    const failed = this.completedTasks.filter(r => !r.success).length;
    const cached = this.completedTasks.filter(r => r.cached).length;

    return {
      total,
      succeeded,
      failed,
      cached,
      averageDuration: total > 0
        ? this.completedTasks.reduce((sum, r) => sum + r.duration, 0) / total
        : 0,
      totalTime: this.completedTasks.reduce((sum, r) => sum + r.duration, 0),
    };
  }
}

interface BuildStats {
  total: number;
  succeeded: number;
  failed: number;
  cached: number;
  averageDuration: number;
  totalTime: number;
}

class BuildQueueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildQueueError';
  }
}
```

### 6.2 CacheManager

```typescript
interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  size: number;
  hits: number;
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private diskCacheDir: string;
  private maxMemoryMB: number;
  private currentMemoryMB: number = 0;
  private eventBus: IEventBus;

  constructor(
    eventBus: IEventBus,
    options: { diskCacheDir?: string; maxMemoryMB?: number } = {},
  ) {
    this.eventBus = eventBus;
    this.diskCacheDir = options.diskCacheDir || path.join(process.cwd(), '.build-cache');
    this.maxMemoryMB = options.maxMemoryMB || 512;
    this.ensureDiskCache();
  }

  private ensureDiskCache(): void {
    try {
      if (!fs.existsSync(this.diskCacheDir)) {
        fs.mkdirSync(this.diskCacheDir, { recursive: true });
      }
    } catch {}
  }

  async getBuildCache(packageName: string): Promise<BuildResult | null> {
    const cacheKey = `build:${packageName}`;
    const diskKey = path.join(this.diskCacheDir, `${packageName}.json`);

    // 1. Tentar memory cache primeiro
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      memoryEntry.hits++;
      return memoryEntry.value as BuildResult;
    }

    // 2. Tentar disk cache
    try {
      if (fs.existsSync(diskKey)) {
        const data = JSON.parse(fs.readFileSync(diskKey, 'utf-8')) as BuildResult;
        const sourceHash = await this.computeSourceHash(packageName);
        const storedHash = data.output?.match(/hash:(\w+)/)?.[1];

        if (!storedHash || storedHash === sourceHash) {
          // Colocar em memory cache
          this.setMemoryCache(cacheKey, data, 3600000); // 1h TTL
          return data;
        }
      }
    } catch {}

    return null;
  }

  async setBuildCache(packageName: string, result: BuildResult): Promise<void> {
    const cacheKey = `build:${packageName}`;
    const diskKey = path.join(this.diskCacheDir, `${packageName}.json`);

    // Incluir hash do source para invalidar quando mudar
    const sourceHash = await this.computeSourceHash(packageName);
    const cachedResult = {
      ...result,
      output: `${result.output || ''}\nhash:${sourceHash}`,
    };

    // Memory cache
    this.setMemoryCache(cacheKey, cachedResult, 3600000);

    // Disk cache
    try {
      fs.writeFileSync(diskKey, JSON.stringify(cachedResult, null, 2));
    } catch (error) {
      console.error(`Failed to write disk cache for ${packageName}:`, error);
    }
  }

  invalidatePackageCache(packageName: string): void {
    const cacheKey = `build:${packageName}`;
    this.memoryCache.delete(cacheKey);

    const diskKey = path.join(this.diskCacheDir, `${packageName}.json`);
    try {
      if (fs.existsSync(diskKey)) {
        fs.unlinkSync(diskKey);
      }
    } catch {}
  }

  invalidateAllCache(): void {
    this.memoryCache.clear();
    try {
      if (fs.existsSync(this.diskCacheDir)) {
        fs.rmSync(this.diskCacheDir, { recursive: true });
        fs.mkdirSync(this.diskCacheDir, { recursive: true });
      }
    } catch {}
  }

  private setMemoryCache(key: string, value: any, ttl: number): void {
    const size = this.estimateSize(value);
    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      ttl,
      size,
      hits: 0,
    };

    // Evitar memory pressure
    if (this.currentMemoryMB + size > this.maxMemoryMB) {
      this.evictLRU();
    }

    this.memoryCache.set(key, entry);
    this.currentMemoryMB += size;
  }

  private evictLRU(): void {
    // Remover 20% dos entries menos acessados
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.hits - b.hits);

    const toEvict = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toEvict; i++) {
      const [key, entry] = entries[i];
      this.memoryCache.delete(key);
      this.currentMemoryMB -= entry.size;
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private estimateSize(value: any): number {
    // Estimativa simples de tamanho em MB
    const str = JSON.stringify(value);
    return Math.ceil(str.length / (1024 * 1024));
  }

  private async computeSourceHash(packageName: string): Promise<string> {
    const { createHash } = await import('node:crypto');
    const packagePath = path.join(process.cwd(), 'packages', packageName);

    try {
      const files = this.getSourceFiles(packagePath);
      const hash = createHash('sha256');

      for (const file of files.slice(0, 50)) { // Limitar a 50 arquivos
        try {
          const content = fs.readFileSync(file);
          hash.update(content);
        } catch {}
      }

      return hash.digest('hex').slice(0, 16);
    } catch {
      return Date.now().toString(16); // Fallback: sempre invalidar
    }
  }

  private getSourceFiles(dir: string): string[] {
    const files: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          files.push(...this.getSourceFiles(fullPath));
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {}
    return files;
  }

  getStats(): CacheStats {
    const entries = Array.from(this.memoryCache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

    let diskCount = 0;
    try {
      if (fs.existsSync(this.diskCacheDir)) {
        diskCount = fs.readdirSync(this.diskCacheDir).length;
      }
    } catch {}

    return {
      memoryEntries: this.memoryCache.size,
      memoryUsageMB: this.currentMemoryMB,
      maxMemoryMB: this.maxMemoryMB,
      totalHits,
      diskEntries: diskCount,
    };
  }
}

interface CacheStats {
  memoryEntries: number;
  memoryUsageMB: number;
  maxMemoryMB: number;
  totalHits: number;
  diskEntries: number;
}
```

### 6.3 ResourceMonitor

```typescript
interface ResourceState {
  totalMemoryMB: number;
  freeMemoryMB: number;
  usedMemoryMB: number;
  cpuUsage: number;
  cpuCores: number;
  nodeProcesses: ProcessInfo[];
  allocatedMB: number;
}

interface ProcessInfo {
  pid: number;
  name: string;
  memoryMB: number;
  cpuPercent: number;
  command: string;
}

interface AllocationRequest {
  id: string;
  memoryMB: number;
  priority: number;
  timestamp: number;
  status: 'pending' | 'allocated' | 'released';
}

class ResourceMonitor {
  private allocations: Map<string, AllocationRequest> = new Map();
  private totalAllocatedMB: number = 0;
  private maxAllocatableMB: number;
  private checkInterval: NodeJS.Timeout | null = null;
  private eventBus: IEventBus;
  private history: ResourceSnapshot[] = [];

  constructor(
    eventBus: IEventBus,
    options: { maxAllocatableMB?: number } = {},
  ) {
    this.eventBus = eventBus;
    this.maxAllocatableMB = options.maxAllocatableMB || 24576; // 24GB default
  }

  async canAllocate(memoryMB: number): Promise<boolean> {
    const state = await this.getCurrentState();
    const projectedUsage = this.totalAllocatedMB + memoryMB;
    const availableMB = state.freeMemoryMB + (state.totalMemoryMB - this.maxAllocatableMB > 0
      ? state.totalMemoryMB - this.maxAllocatableMB
      : 0);

    return projectedUsage <= availableMB && projectedUsage <= this.maxAllocatableMB;
  }

  async allocate(memoryMB: number, priority: number = 5): Promise<string> {
    const id = crypto.randomUUID();
    const request: AllocationRequest = {
      id,
      memoryMB,
      priority,
      timestamp: Date.now(),
      status: 'allocated',
    };

    // Se não puder alocar, rejeitar
    if (!await this.canAllocate(memoryMB)) {
      request.status = 'pending';
      this.allocations.set(id, request);
      throw new ResourceError(`Cannot allocate ${memoryMB}MB — insufficient resources`);
    }

    this.allocations.set(id, request);
    this.totalAllocatedMB += memoryMB;

    await this.eventBus.emit('resource.allocated', {
      id,
      memoryMB,
      priority,
      totalAllocated: this.totalAllocatedMB,
      timestamp: Date.now(),
    });

    return id;
  }

  async deallocate(memoryMB: number, allocationId?: string): Promise<void> {
    if (allocationId) {
      const request = this.allocations.get(allocationId);
      if (request) {
        request.status = 'released';
        this.totalAllocatedMB -= request.memoryMB;
        this.allocations.delete(allocationId);
      }
    } else {
      this.totalAllocatedMB = Math.max(0, this.totalAllocatedMB - memoryMB);
    }

    await this.eventBus.emit('resource.deallocated', {
      id: allocationId,
      memoryMB,
      totalAllocated: this.totalAllocatedMB,
      timestamp: Date.now(),
    });
  }

  async getCurrentState(): Promise<ResourceState> {
    const os = await import('node:os');
    const totalMemoryMB = Math.round(os.totalmem() / (1024 * 1024));
    const freeMemoryMB = Math.round(os.freemem() / (1024 * 1024));
    const cpuCores = os.cpus().length;

    const nodeProcesses = await this.getNodeProcesses();

    return {
      totalMemoryMB,
      freeMemoryMB,
      usedMemoryMB: totalMemoryMB - freeMemoryMB,
      cpuUsage: await this.getCPUUsage(),
      cpuCores,
      nodeProcesses,
      allocatedMB: this.totalAllocatedMB,
    };
  }

  async getPeakMemory(processName: string): Promise<number> {
    // Em um sistema real, usaria pwin32 ou similar
    return 0;
  }

  async getNodeProcesses(): Promise<ProcessInfo[]> {
    try {
      const processes: ProcessInfo[] = [];
      const { execSync } = await import('node:child_process');

      if (process.platform === 'win32') {
        const output = execSync(
          'powershell "Get-Process node,bun,bunx | Select-Object Id, ProcessName, WorkingSet64, CPU @{N=\'Command\';E={try{(Get-CimInstance Win32_Process -Filter \\\"ProcessId = \$(\$_.Id)\\\").CommandLine}catch{\\\"\\\"}}}"',
          { encoding: 'utf8', timeout: 5000 },
        );
        // Parse output (simplificado)
      }

      return processes;
    } catch {
      return [];
    }
  }

  private async getCPUUsage(): Promise<number> {
    const os = await import('node:os');
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }

    const idlePercent = totalIdle / totalTick;
    return Math.round((1 - idlePercent) * 100);
  }

  startMonitoring(intervalMs: number = 5000): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      const state = await this.getCurrentState();
      this.history.push({
        timestamp: Date.now(),
        ...state,
      });

      // Manter apenas últimas 1000 entradas
      if (this.history.length > 1000) {
        this.history = this.history.slice(-500);
      }

      // Alertar se memória crítica
      if (state.freeMemoryMB < 2048) {
        await this.eventBus.emit('resource.critical', {
          freeMemoryMB: state.freeMemoryMB,
          totalAllocated: this.totalAllocatedMB,
          timestamp: Date.now(),
        });
      }

      await this.eventBus.emit('resource.updated', {
        freeMemoryMB: state.freeMemoryMB,
        totalAllocated: this.totalAllocatedMB,
        cpuUsage: state.cpuUsage,
        timestamp: Date.now(),
      });
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getHistory(duration: number = 60000): ResourceSnapshot[] {
    const cutoff = Date.now() - duration;
    return this.history.filter(h => h.timestamp >= cutoff);
  }

  getStats(): MonitorStats {
    const state = this.history[this.history.length - 1];
    const peakAllocated = Math.max(...this.history.map(h => h.allocatedMB), 0);
    const avgMemory = this.history.length > 0
      ? this.history.reduce((sum, h) => sum + h.usedMemoryMB, 0) / this.history.length
      : 0;

    return {
      currentAllocated: this.totalAllocatedMB,
      peakAllocated,
      averageMemoryUsage: avgMemory,
      pendingAllocations: Array.from(this.allocations.values()).filter(a => a.status === 'pending').length,
      totalSamples: this.history.length,
      monitoringSince: this.history[0]?.timestamp || Date.now(),
    };
  }
}

interface ResourceSnapshot {
  timestamp: number;
  totalMemoryMB: number;
  freeMemoryMB: number;
  usedMemoryMB: number;
  cpuUsage: number;
  cpuCores: number;
  nodeProcesses: ProcessInfo[];
  allocatedMB: number;
}

interface MonitorStats {
  currentAllocated: number;
  peakAllocated: number;
  averageMemoryUsage: number;
  pendingAllocations: number;
  totalSamples: number;
  monitoringSince: number;
}

class ResourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceError';
  }
}
```

### 6.4 Parallel Compilation Manager

```typescript
class ParallelCompilationManager {
  private maxWorkers: number;
  private activeWorkers: number = 0;
  private queue: Array<{ package: string; resolve: (result: BuildResult) => void; reject: (error: Error) => void }> = [];

  constructor(
    private buildOptimizer: BuildOptimizer,
    private resourceMonitor: ResourceMonitor,
    maxWorkers: number = 4,
  ) {
    this.maxWorkers = maxWorkers;
  }

  async buildPackages(packages: string[], config?: Partial<BuildConfig>): Promise<BuildResult[]> {
    const results: BuildResult[] = [];
    const errors: Error[] = [];
    const total = packages.length;

    const tasks = packages.map((pkg) => {
      return new Promise<BuildResult>((resolve, reject) => {
        this.enqueue(pkg, resolve, reject);
      });
    });

    const settled = await Promise.allSettled(tasks);
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push(result.reason);
      }
    }

    if (errors.length > 0) {
      throw new ParallelBuildError(
        `${errors.length}/${total} packages failed to build`,
        results,
        errors,
      );
    }

    return results;
  }

  private enqueue(
    packageName: string,
    resolve: (result: BuildResult) => void,
    reject: (error: Error) => void,
  ): void {
    if (this.activeWorkers < this.maxWorkers) {
      this.processNext(packageName, resolve, reject);
    } else {
      this.queue.push({ package: packageName, resolve, reject });
    }
  }

  private async processNext(
    packageName: string,
    resolve: (result: BuildResult) => void,
    reject: (error: Error) => void,
  ): Promise<void> {
    this.activeWorkers++;

    try {
      const result = await this.buildOptimizer.buildPackage(packageName);
      resolve(result);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeWorkers--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const next = this.queue.shift()!;
      this.processNext(next.package, next.resolve, next.reject);
    }
  }

  setMaxWorkers(max: number): void {
    this.maxWorkers = max;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getActiveWorkers(): number {
    return this.activeWorkers;
  }
}

class ParallelBuildError extends Error {
  constructor(
    message: string,
    public partialResults: BuildResult[],
    public errors: Error[],
  ) {
    super(message);
    this.name = 'ParallelBuildError';
  }
}
```

---

## 7. INTEGRAÇÃO COM CLI BUILD COMMANDS

### 7.1 CLI Integration

```typescript
class ResourceCLIIntegration {
  constructor(
    private buildOptimizer: BuildOptimizer,
    private cacheManager: CacheManager,
    private resourceMonitor: ResourceMonitor,
    private parallelCompilation: ParallelCompilationManager,
  ) {}

  async handleBuildCommand(args: string[]): Promise<CommandResult> {
    const subcommand = args[0] || 'all';
    const options = this.parseOptions(args.slice(1));

    switch (subcommand) {
      case 'all':
        return this.buildAll(options);
      case 'package':
        return this.buildPackage(args[1], options);
      case 'parallel':
        return this.buildParallel(args.slice(1), options);
      case 'cache':
        return this.handleCacheCommand(args.slice(1));
      case 'status':
        return this.getStatus();
      case 'monitor':
        return this.startMonitor(options);
      default:
        return {
          success: false,
          output: `Unknown build subcommand: ${subcommand}\nUsage: build <all|package|parallel|cache|status|monitor>`,
        };
    }
  }

  private async buildAll(options: BuildOptions): Promise<CommandResult> {
    const startTime = Date.now();
    const packages = await this.discoverPackages();

    if (options.parallel) {
      const results = await this.parallelCompilation.buildPackages(packages);
      return this.formatResults(results, startTime);
    } else {
      const results = await this.buildOptimizer.buildAll(packages);
      return this.formatResults(results, startTime);
    }
  }

  private async buildPackage(packageName: string, options: BuildOptions): Promise<CommandResult> {
    const startTime = Date.now();
    const result = await this.buildOptimizer.buildPackage(packageName, {
      incremental: options.incremental,
      cacheKey: packageName,
      parallel: false,
      maxWorkers: 1,
      flags: options.flags || [],
    });

    return this.formatResults([result], startTime);
  }

  private async buildParallel(packages: string[], options: BuildOptions): Promise<CommandResult> {
    const startTime = Date.now();
    const maxWorkers = options.maxWorkers || 4;
    this.parallelCompilation.setMaxWorkers(maxWorkers);

    const results = await this.parallelCompilation.buildPackages(packages);
    return this.formatResults(results, startTime);
  }

  private async handleCacheCommand(args: string[]): Promise<CommandResult> {
    const sub = args[0] || 'status';

    switch (sub) {
      case 'status':
        return {
          success: true,
          output: JSON.stringify(this.cacheManager.getStats(), null, 2),
        };
      case 'clear':
        this.cacheManager.invalidateAllCache();
        return { success: true, output: 'Cache cleared' };
      case 'invalidate':
        for (const pkg of args.slice(1)) {
          this.cacheManager.invalidatePackageCache(pkg);
        }
        return { success: true, output: `Invalidated cache for: ${args.slice(1).join(', ')}` };
      default:
        return { success: false, output: 'Usage: build cache <status|clear|invalidate>' };
    }
  }

  private async getStatus(): Promise<CommandResult> {
    const state = await this.resourceMonitor.getCurrentState();
    const buildStats = this.buildOptimizer.getStats();
    const cacheStats = this.cacheManager.getStats();
    const monitorStats = this.resourceMonitor.getStats();

    return {
      success: true,
      output: `=== Build Status ===
Packages: ${state.cpuCores} cores | ${state.totalMemoryMB}MB total | ${state.freeMemoryMB}MB free
Builds: ${buildStats.total} total (${buildStats.succeeded} ok, ${buildStats.failed} failed, ${buildStats.cached} cached)
Cache: ${cacheStats.memoryEntries} memory entries (${cacheStats.memoryUsageMB}MB) | ${cacheStats.diskEntries} disk entries
Monitor: ${monitorStats.totalSamples} samples | ${monitorStats.currentAllocated}MB allocated
Workers: ${this.parallelCompilation.getActiveWorkers()} active / ${this.parallelCompilation.getQueueLength()} queued`,
    };
  }

  private async startMonitor(options: BuildOptions): Promise<CommandResult> {
    const interval = options.interval || 5000;
    this.resourceMonitor.startMonitoring(interval);

    return {
      success: true,
      output: `Resource monitoring started (interval: ${interval}ms). Use 'build monitor stop' to stop.`,
    };
  }

  private parseOptions(args: string[]): BuildOptions {
    const options: BuildOptions = {};
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--parallel':
        case '-p':
          options.parallel = true;
          break;
        case '--incremental':
        case '-i':
          options.incremental = true;
          break;
        case '--max-workers':
          options.maxWorkers = parseInt(args[++i], 10);
          break;
        case '--interval':
          options.interval = parseInt(args[++i], 10);
          break;
        case '--flag':
          if (!options.flags) options.flags = [];
          options.flags.push(args[++i]);
          break;
        case '--json':
          options.json = true;
          break;
      }
    }
    return options;
  }

  private async discoverPackages(): Promise<string[]> {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const packagesDir = path.join(process.cwd(), 'packages');

    try {
      return fs.readdirSync(packagesDir).filter(p => {
        const pkgPath = path.join(packagesDir, p, 'package.json');
        return fs.existsSync(pkgPath);
      });
    } catch {
      return [];
    }
  }

  private formatResults(results: BuildResult[], startTime: number): CommandResult {
    const totalTime = Date.now() - startTime;
    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const cached = results.filter(r => r.cached);

    return {
      success: failed.length === 0,
      output: `=== Build Summary ===
Total: ${results.length} packages
Succeeded: ${succeeded.length} (${cached.length} cached)
Failed: ${failed.length}
Duration: ${(totalTime / 1000).toFixed(1)}s

${failed.length > 0 ? `\nFailed packages:\n${failed.map(r => `  - ${r.packageName}: ${r.error}`).join('\n')}` : ''}`,
      data: results,
    };
  }
}

interface BuildOptions {
  parallel?: boolean;
  incremental?: boolean;
  maxWorkers?: number;
  interval?: number;
  flags?: string[];
  json?: boolean;
}

interface CommandResult {
  success: boolean;
  output: string;
  data?: any;
}
```

### 7.2 CLI Commands Registration

```typescript
// Registro no CLI principal
class BuildCommandRegistration {
  static register(cli: CLIRegistry, integration: ResourceCLIIntegration): void {
    cli.registerCommand('build', {
      description: 'Build packages with resource optimization',
      subcommands: {
        'all': {
          description: 'Build all packages',
          options: [
            { name: '--parallel', short: '-p', description: 'Build in parallel' },
            { name: '--incremental', short: '-i', description: 'Use incremental build' },
            { name: '--max-workers', short: '-w', description: 'Max parallel workers' },
          ],
          handler: (args) => integration.handleBuildCommand(['all', ...args]),
        },
        'package': {
          description: 'Build a specific package',
          options: [
            { name: '--incremental', short: '-i', description: 'Use incremental build' },
          ],
          handler: (args) => integration.handleBuildCommand(['package', ...args]),
        },
        'parallel': {
          description: 'Build packages in parallel',
          options: [
            { name: '--max-workers', short: '-w', description: 'Max parallel workers' },
          ],
          handler: (args) => integration.handleBuildCommand(['parallel', ...args]),
        },
        'cache': {
          description: 'Manage build cache',
          subcommands: {
            'status': { description: 'Show cache status', handler: () => integration.handleBuildCommand(['cache', 'status']) },
            'clear': { description: 'Clear all cache', handler: () => integration.handleBuildCommand(['cache', 'clear']) },
            'invalidate': { description: 'Invalidate package cache', handler: (args) => integration.handleBuildCommand(['cache', 'invalidate', ...args]) },
          },
        },
        'status': {
          description: 'Show resource and build status',
          handler: () => integration.handleBuildCommand(['status']),
        },
        'monitor': {
          description: 'Start resource monitoring',
          options: [
            { name: '--interval', short: '-t', description: 'Monitoring interval in ms', default: 5000 },
          ],
          handler: (args) => integration.handleBuildCommand(['monitor', ...args]),
        },
      },
    });
  }
}
```

### 7.3 Uso via CLI

```bash
# Build otimizado de todos os pacotes
IDEIA build all --parallel --incremental

# Build de pacote específico
IDEIA build package @ideia/event-bus

# Build paralelo com workers limitados
IDEIA build parallel @ideia/event-bus @ideia/agent-runtime @ideia/policy-engine --max-workers=2

# Gerenciar cache
IDEIA build cache status
IDEIA build cache clear
IDEIA build cache invalidate @ideia/event-bus

# Monitorar recursos
IDEIA build monitor --interval 3000

# Ver status
IDEIA build status
```

---

## 8. Plano de Implementação

### Fase 1 — Imediata (hoje)

| Tarefa | Esforço | Impacto |
|--------|---------|---------|
| Criar `scripts/dev-resource-guard.ps1` | 30min | ⭐ Médio (monitoramento) |
| Criar `scripts/kill-heavy-processes.ps1` | 15min | ⭐⭐ Alto (emergência) |
| Adicionar `typecheck:fast`, `test:scope`, `lint:fast` ao package.json | 10min | ⭐⭐⭐ Alto (prevenção) |
| Criar `.env.resources` | 5min | ⭐⭐ Alto |
| Adicionar `JEST_MAX_WORKERS=2` ao perfil | 5min | ⭐⭐⭐ Alto |

### Fase 2 — Curto Prazo (1-2 dias)

| Tarefa | Esforço | Impacto |
|--------|---------|---------|
| Implementar BuildOptimizer | 4h | ⭐⭐⭐ Alto (build 2-3x mais rápido) |
| Implementar CacheManager (memory + disk) | 3h | ⭐⭐⭐ Muito alto (cache reutilizável) |
| Implementar ResourceMonitor | 3h | ⭐⭐⭐ Alto (visibilidade + alertas) |
| Substituir chokidar por NativeWatcher | 2h | ⭐⭐⭐ Alto (CPU constante) |
| Adicionar `--incremental` ao tsconfig root | 10min | ⭐⭐⭐ Alto (typecheck 2x) |
| Configurar ESLint cache persistente | 5min | ⭐⭐ Médio |
| Adicionar `check-resource-budget.ps1` como pre-hook | 30min | ⭐⭐ Médio |
| Configurar Jest maxWorkers dinâmico | 15min | ⭐⭐⭐ Alto |

### Fase 3 — Médio Prazo (1 semana)

| Tarefa | Esforço | Impacto |
|--------|---------|---------|
| Implementar ParallelCompilationManager | 4h | ⭐⭐⭐ Muito alto (build paralelo) |
| Implementar ResourceCLIIntegration | 2h | ⭐⭐⭐ Alto (CLI unificado) |
| Implementar DependencyPrebuilder | 3h | ⭐⭐ Médio (build mais rápido) |
| Registrar comandos CLI `build` | 1h | ⭐⭐⭐ Alto (usabilidade) |
| Avaliar swc para typecheck rápido em modo dev | 4h | ⭐⭐⭐ Alto (10-50x mais rápido) |
| Implementar `set-task-priority.ps1` automático | 2h | ⭐⭐ Médio |
| Adicionar resource budget check nos quality gates | 1h | ⭐ Médio |

---

## 9. Anexo: Quick Reference

### Quando o sistema começar a travar

```powershell
# 1. Ver o que está consumindo
Get-Process | Where-Object { $_.ProcessName -in 'node','bun','bunx' } |
    Sort-Object WorkingSet64 -Descending |
    Select-Object Id, ProcessName,
        @{N="MemMB";E={[math]::Round($_.WorkingSet64/1MB)}},
        @{N="CPU(s)";E={[math]::Round($_.CPU)}}

# 2. Matar só o mais pesado
Stop-Process -Id <PID> -Force

# 3. Ou limpar tudo de uma vez
.\scripts\kill-heavy-processes.ps1

# 4. Retomar com recursos limitados
$env:NODE_OPTIONS="--max-old-space-size=2048"
$env:JEST_MAX_WORKERS=2
tsc --noEmit --incremental
```

### Memória por Operação

| Operação | RAM Mínima | RAM Recomendada | CPU |
|----------|-----------|----------------|-----|
| tsc --noEmit (full, 177 pkgs) | 4GB | 8GB | 1-2 cores 100% |
| tsc --noEmit --incremental | 2GB | 4GB | 1 core 100% |
| swc parse (fast) | 0.5GB | 1GB | 1 core 30% |
| Jest (~4700+ testes, 2 workers) | 4GB | 8GB | 2 cores 100% |
| Jest (~4700+ testes, full workers) | 8GB | 16GB | N-1 cores 100% |
| ESLint (177 pacotes, cached) | 1GB | 2GB | 1 core 60% |
| ESLint (no cache) | 2GB | 4GB | 1 core 100% |
| Theia webpack build | 2GB | 4GB | 1-2 cores 100% |
| Bun (AI tooling, 1 processo) | 1GB | 2GB | 1 core 20-50% |
| chokidar (watcher) | 0.3GB | 0.5GB | 5-15% constante |
| Dev server (backend + WS) | 0.5GB | 1GB | 10-30% |

### Regra de Ouro

> **Nunca rode `tsc --noEmit` + Jest (full) + ESLint ao mesmo tempo.**
> São 3 operações CPU-bound que juntas consomem 14-28GB e saturam todos os cores.
> Use `typecheck:fast`, `test:scope`, `lint:fast` em paralelo, ou rode sequencialmente.

### Comandos CLI de Build Otimizados

```bash
# Build rápido com cache
IDEIA build all --parallel --incremental

# Build de pacote específico com cache
IDEIA build package @ideia/event-bus --incremental

# Monitoramento de recursos
IDEIA build monitor --interval 3000

# Gerenciamento de cache
IDEIA build cache status
IDEIA build cache clear

# Status completo
IDEIA build status
```

### Relação BuildOptimizer + CacheManager + ResourceMonitor

```
┌──────────────────────────────────────────────────────────────────────┐
│                    BUILD OPTIMIZATION SYSTEM                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  CLI Command                                                           │
│    → ResourceCLIIntegration.handleBuildCommand()                       │
│      → ResourceMonitor.canAllocate() ← verifica memória livre         │
│      → BuildOptimizer.buildPackage() ← executa build                  │
│        → CacheManager.getBuildCache() ← verifica cache primeiro       │
│        → CacheManager.setBuildCache() ← salva resultado               │
│      → ParallelCompilationManager ← gerencia paralelismo              │
│                                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ BuildOptim  │→│ CacheManager │→│ Resource     │                 │
│  │ izer        │  │              │  │ Monitor      │                 │
│  ├─────────────┤  ├──────────────┤  ├──────────────┤                 │
│  │ Orquestra   │  │ Memory cache │  │ Alocação     │                 │
│  │ Build tasks │  │ Disk cache   │  │ Monitoramento │                 │
│  │ Dependências│  │ Invalidação  │  │ Alertas      │                 │
│  │ Paralelismo │  │ LRU eviction │  │ Histórico    │                 │
│  └─────────────┘  └──────────────┘  └──────────────┘                 │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

> **Estudo completo v2.0.** Inclui implementação de BuildOptimizer, CacheManager, ResourceMonitor, ParallelCompilationManager e ResourceCLIIntegration para CLI. Diagnóstico completo de consumo, estratégias de mitigação imediatas e permanentes, scripts PowerShell e TypeScript.
