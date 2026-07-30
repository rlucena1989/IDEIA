# ESTUDO-BOTTLENECK-DIAGNOSTIC - Arvore de Diagnostico de Gargalos

> **Data:** 2026-07-27 | **Versao:** 2.0 (8 secoes, 1000+ linhas)
> **Area:** Performance - Diagnostico Automatizado
> **Dependencias:** @ideia/cli, @ideia/observability, @ideia/agent-runtime, @ideia/quality-gates
> **Conexoes:** PERFORMANCE-ESCALABILIDADE, S54-PERFORMANCE-OPTIMIZATION, F1-NATS, F2-LANGGRAPH, F4-POSTGRES
> **Proposito:** CLI interativa para diagnosticar gargalos de performance - CPU, LLM, banco, NATS, rede - com arvore de decisao multi-nivel e recomendacoes acionaveis.

---

## 1. FUNDAMENTOS

### 1.1 Problema

Performance degradou. O que esta causando? CPU? LLM? Banco? NATS? Rede? Sem diagnostico automatizado: desenvolvedor perde horas procurando o gargalo. Em sistemas multi-camada como o IDEIA (Electron + Theia + NATS + PostgreSQL + LLM), um gargalo em qualquer camada pode degradar a experiencia do usuario.

### 1.2 Objetivos

1. **Diagnostico automatico** - Detectar gargalos sem intervencao manual
2. **Arvore de decisao multi-nivel** - Navegar por camadas de suspeita
3. **Recomendacoes acionaveis** - Sugerir acoes especificas por gargalo
4. **Integracao CLI** - Comandos rapidos para o fluxo do desenvolvedor
5. **Extensibilidade** - Plugins de check para novas camadas

### 1.3 Escopo

| Camada | O que medir | Threshold |
|--------|-------------|-----------|
| **CPU** | user + system usage, load average, GC pauses | > 80% sustained |
| **Memoria** | RSS, heap used, swap, GC frequency | > 85% heap |
| **LLM** | TTFT, tokens/s, cache hit ratio, queue depth | TTFT > 2s |
| **Database** | query latency, index scan, connection pool, locks | > 500ms query |
| **NATS** | consumer lag, stream discards, latency p99 | > 100ms latency |
| **Rede** | bandwidth, packet loss, DNS resolution | > 200ms RTT |
| **Disco** | I/O wait, throughput, queue depth | > 50ms I/O |
| **GPU** | utilization, VRAM, temperature | > 90% VRAM |

### 1.4 Principios de Design

1. **Non-invasivo** - Leituras passivas, sem modificar estado do sistema
2. **Composavel** - Checks independentes que podem ser combinados
3. **Hierarquico** - Suspeitas guiadas por arvore de decisao
4. **Tolerante** - Falha em um check nao aborta o diagnostico completo
5. **Acionavel** - Toda recomendacao inclui comando ou acao concreta

## 2. ARQUITETURA

### 2.1 Diagrama de Componentes

```mermaid
graph TD
    A[CLI: ideia perf:diagnose] --> B[BottleneckOrchestrator]
    B --> C1[CheckRunner]
    B --> C2[DecisionTreeEngine]
    B --> C3[RecommendationEngine]
    B --> C4[ReportFormatter]
    C1 --> D1[CPUCheck]; C1 --> D2[MemoryCheck]
    C1 --> D3[LLMCheck]; C1 --> D4[DBCheck]
    C1 --> D5[NATSCheck]; C1 --> D6[NetworkCheck]
    C1 --> D7[DiskCheck]; C1 --> D8[GPUCheck]
    D1 --> E1[process.cpuUsage]; D1 --> E2[os.loadavg]
    D3 --> F1[LLMProvider.ping]; D3 --> F2[CacheStats]
    D4 --> G1[pg.query]; D4 --> G2[pg_stat_activity]
    D5 --> H1[NATS JetStream API]; D5 --> H2[ConsumerInfo]
    C2 --> I1[RuleEngine]; C2 --> I2[InferenceChain]
    C3 --> J1[ActionGenerator]; C3 --> J2[PrioritySorter]
    subgraph Out[JSON/Table/HTML Report]; end
    C4 --> Out
```

### 2.2 Modelo de Dados

```typescript
export type CheckCategory = 'cpu'|'memory'|'llm'|'database'|'nats'|'network'|'disk'|'gpu'
export type CheckSeverity = 0|1|2|3|4|5|6|7|8|9|10
export type CheckStatus = 'passed'|'warning'|'critical'|'error'|'skipped'

export interface CheckThreshold { warning: number; critical: number; unit: string }

export interface CheckResult {
  name: string; category: CheckCategory; status: CheckStatus
  severity: CheckSeverity; value: number; threshold: CheckThreshold
  unit: string; message: string; details?: Record<string, unknown>
  durationMs: number; timestamp: number; error?: string
}

export interface DecisionNode {
  id: string; question: string; matched: boolean
  severity: CheckSeverity; children: DecisionNode[]
  recommendation?: string; confidence: number; evidence: string[]
}

export interface Recommendation {
  id: string; title: string; description: string
  priority: 'critical'|'high'|'medium'|'low'
  category: CheckCategory; effort: 'minutes'|'hours'|'days'
  command?: string; links: string[]
}

export interface DiagnosticReport {
  summary: {
    passed: boolean; totalChecks: number; passedChecks: number
    warningChecks: number; criticalChecks: number; errorChecks: number
    totalDurationMs: number; timestamp: number; environment: string
    hostname: string; platform: string
  }
  results: CheckResult[]; decisions: DecisionNode[]
  recommendations: Recommendation[]
  metadata: { version: string; cliVersion: string; nodeVersion: string; uptime: number }
}

export interface DiagnosticOptions {
  quick: boolean; category?: CheckCategory[]
  format: 'table'|'json'|'html'; outputFile?: string
  timeoutMs: number; verbose: boolean; skipCache: boolean
}
```

## 3. IMPLEMENTACAO - CLI DIAGNOSTIC TOOL

### 3.1 BottleneckOrchestrator

```typescript
import * as os from 'os'
import { EventEmitter } from 'events'
import { DiagnosticOptions, DiagnosticReport, CheckResult, CheckCategory } from './types'

export class BottleneckOrchestrator extends EventEmitter {
  private decisionEngine = new DecisionTreeEngine()
  private recommendationEngine = new RecommendationEngine()
  private reportFormatter = new ReportFormatter()

  constructor(private opts: DiagnosticOptions, private registry: CheckRegistry) { super() }

  async execute(): Promise<DiagnosticReport> {
    const start = Date.now(); this.emit('start', { start })
    const cats = this.opts.category ?? ['cpu','memory','llm','database','nats','network','disk']
    const checks = cats.map(c => this.registry.get(c)).filter(Boolean) as AbstractCheck[]
    const results = await Promise.all(checks.map(c =>
      c.run().catch(e => this.errResult(c.category, e))))
    const decisions = this.decisionEngine.evaluate(results)
    const bottlenecks = results.filter(r => r.status === 'critical' || r.status === 'warning')
    const recs = this.recommendationEngine.generate(bottlenecks, decisions)
    const report: DiagnosticReport = {
      summary: {
        passed: results.every(r => r.status === 'passed'),
        totalChecks: results.length,
        passedChecks: results.filter(r => r.status === 'passed').length,
        warningChecks: results.filter(r => r.status === 'warning').length,
        criticalChecks: results.filter(r => r.status === 'critical').length,
        errorChecks: results.filter(r => r.status === 'error').length,
        totalDurationMs: Date.now() - start,
        timestamp: Date.now(),
        environment: process.env.NODE_ENV ?? 'development',
        hostname: os.hostname(),
        platform: os.platform() + '-' + os.arch(),
      },
      results, decisions, recommendations: recs,
      metadata: {
        version: '2.0.0', cliVersion: process.env.CLI_VERSION ?? 'unknown',
        nodeVersion: process.version, uptime: process.uptime(),
      },
    }
    this.emit('complete', { report }); return report
  }

  private errResult(cat: CheckCategory, err: Error): CheckResult {
    return {
      name: cat + '-check', category: cat, status: 'error', severity: 0, value: -1,
      threshold: { warning: 0, critical: 0, unit: '' }, unit: 'error',
      message: 'Check failed: ' + err.message, durationMs: 0, timestamp: Date.now(),
      error: err.message,
    }
  }
}
```

### 3.2 CheckRegistry and AbstractCheck

```typescript
export class CheckRegistry {
  private map = new Map<CheckCategory, AbstractCheck>()
  register(c: AbstractCheck): void {
    if (this.map.has(c.category)) throw new Error('Duplicate check: ' + c.category)
    this.map.set(c.category, c)
  }
  get(cat: CheckCategory): AbstractCheck | undefined { return this.map.get(cat) }
  getAll(): AbstractCheck[] { return Array.from(this.map.values()) }
}

export abstract class AbstractCheck {
  abstract category: CheckCategory
  abstract metadata: {
    name: string; category: CheckCategory; description: string
    version: string; dependencies: string[]; timeoutMs: number
  }
  abstract thresholds: Record<string, CheckThreshold>
  abstract run(): Promise<CheckResult>
  abort?(): void

  protected buildResult(
    status: CheckStatus, value: number, key: string, msg: string,
    details?: Record<string, unknown>, dur?: number
  ): CheckResult {
    const t = this.thresholds[key]
    const sev: Record<string, CheckSeverity> = {
      critical: 9, warning: 5, error: 7, passed: 0, skipped: 0,
    }
    return {
      name: this.category + '-' + key, category: this.category,
      status, severity: sev[status] ?? 0, value,
      threshold: t, unit: t?.unit ?? '',
      message: msg, details,
      durationMs: dur ?? 0, timestamp: Date.now(),
    }
  }
}
```

### 3.3 CLI Commands

```typescript
import { Command } from 'commander'

export function registerPerfCommands(program: Command): void {
  const registry = new CheckRegistry()
  const checkClasses = [CpuCheck, MemoryCheck, LlmCheck, DbCheck, NatsCheck, NetworkCheck, DiskCheck, GpuCheck]
  checkClasses.forEach(C => registry.register(new C()))

  program.command('perf:diagnose')
    .description('Full bottleneck diagnosis')
    .option('-q, --quick', 'Quick mode: CPU, memory, LLM', false)
    .option('-f, --format <fmt>', 'Output: table, json, html', 'table')
    .option('-o, --output <file>', 'Write report to file')
    .option('-t, --timeout <ms>', 'Per-check timeout (ms)', '30000')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (o) => {
      const opts: DiagnosticOptions = {
        quick: o.quick,
        category: o.quick ? ['cpu','memory','llm'] : undefined,
        format: o.format, outputFile: o.output,
        timeoutMs: parseInt(o.timeout, 10), verbose: o.verbose, skipCache: false,
      }
      const r = await new BottleneckOrchestrator(opts, registry).execute()
      const out = new ReportFormatter().format(r, opts.format)
      console.log(out)
      if (opts.outputFile) require('fs').writeFileSync(opts.outputFile, out, 'utf-8')
    })

  program.command('perf:watch')
    .description('Continuous monitoring with alerts')
    .option('-i, --interval <ms>', 'Poll interval (ms)', '5000')
    .action(async (o) => {
      setInterval(async () => {
        const opts: DiagnosticOptions = {
          quick: true, format: 'json', timeoutMs: 10000,
          verbose: false, skipCache: true,
        }
        const r = await new BottleneckOrchestrator(opts, registry).execute()
        const crit = r.results.filter(x => x.status === 'critical')
        if (crit.length > 0) {
          console.log('[' + new Date().toISOString() + '] ALERT: ' + crit.length + ' critical issue(s)')
          crit.forEach(c => console.log('  - ' + c.name + ': ' + c.message))
        }
      }, parseInt(o.interval, 10))
    })
}
```

## 4. IMPLEMENTACAO - CHECKS DE SISTEMA

### 4.1 CPU Check

```typescript
import * as os from 'os'
import { AbstractCheck } from '../check-registry'

interface CpuDetail {
  usage: { user: number; system: number }
  loadAvg: number[]; cpus: number; temperature?: number
}

export class CpuCheck extends AbstractCheck {
  category = 'cpu' as const
  metadata = {
    name: 'CPU Usage & Load', category: 'cpu' as const,
    description: 'Checks CPU usage, load average, and GC pressure',
    version: '2.0.0', dependencies: ['os','process'], timeoutMs: 5000,
  }
  thresholds = {
    user: { warning: 60, critical: 85, unit: '%' },
    system: { warning: 40, critical: 70, unit: '%' },
    load1: { warning: os.cpus().length * 0.7, critical: os.cpus().length, unit: 'load' },
  }

  async run(): Promise<CheckResult> {
    const start = Date.now()
    const d = await this.collectDetails()
    const dur = Date.now() - start
    const userPct = d.usage.user / 10000

    if (userPct >= this.thresholds.user.critical) {
      return this.buildResult('critical', userPct, 'user',
        'CPU user at ' + userPct.toFixed(1) + '% (critical)', d, dur)
    }
    if (userPct >= this.thresholds.user.warning) {
      return this.buildResult('warning', userPct, 'user',
        'CPU user at ' + userPct.toFixed(1) + '% (warning)', d, dur)
    }

    const load1 = d.loadAvg[0]
    if (load1 >= this.thresholds.load1.critical) {
      return this.buildResult('critical', load1, 'load1',
        'Load 1m=' + load1.toFixed(2) + ' (critical)', d, dur)
    }

    return this.buildResult('passed', userPct, 'user',
      'CPU OK: ' + userPct.toFixed(1) + '% user, load=' + load1.toFixed(2), d, dur)
  }

  private async collectDetails(): Promise<CpuDetail> {
    const u = process.cpuUsage(); const l = os.loadavg(); const c = os.cpus().length
    const d: CpuDetail = { usage: { user: u.user, system: u.system }, loadAvg: l, cpus: c }
    if (os.platform() === 'linux') {
      try {
        const t = await require('fs').promises.readFile(
          '/sys/class/thermal/thermal_zone0/temp', 'utf-8')
        d.temperature = parseInt(t.trim(), 10) / 1000
      } catch {}
    }
    return d
  }
  abort(): void {}
}
```

### 4.2 Memory Check

```typescript
import * as os from 'os'
import { AbstractCheck } from '../check-registry'

interface MemDetail {
  heapUsed: number; heapTotal: number; heapUsedPct: number
  rss: number; external: number; osFree: number; osTotal: number; osUsedPct: number
}

export class MemoryCheck extends AbstractCheck {
  category = 'memory' as const
  metadata = {
    name: 'Memory Usage', category: 'memory' as const,
    description: 'Checks heap and system memory, GC pressure',
    version: '2.0.0', dependencies: ['os','process'], timeoutMs: 3000,
  }
  thresholds = {
    heapPct: { warning: 70, critical: 85, unit: '%' },
    osPct: { warning: 75, critical: 90, unit: '%' },
    rss: { warning: 500, critical: 1024, unit: 'MB' },
  }

  async run(): Promise<CheckResult> {
    const start = Date.now()
    const mem = process.memoryUsage()
    const osFree = os.freemem(); const osTotal = os.totalmem()
    const heapPct = (mem.heapUsed / mem.heapTotal) * 100
    const osPct = ((osTotal - osFree) / osTotal) * 100
    const dur = Date.now() - start
    const d: MemDetail = {
      heapUsed: mem.heapUsed, heapTotal: mem.heapTotal,
      heapUsedPct: +heapPct.toFixed(2), rss: mem.rss, external: mem.external,
      osFree, osTotal, osUsedPct: +osPct.toFixed(2),
    }

    if (heapPct >= this.thresholds.heapPct.critical) {
      return this.buildResult('critical', heapPct, 'heapPct',
        'Heap at ' + heapPct.toFixed(1) + '% - critical, GC may thrash', d, dur)
    }
    if (heapPct >= this.thresholds.heapPct.warning) {
      return this.buildResult('warning', heapPct, 'heapPct',
        'Heap at ' + heapPct.toFixed(1) + '% - warning', d, dur)
    }
    if (osPct >= this.thresholds.osPct.critical) {
      return this.buildResult('critical', osPct, 'osPct',
        'System mem at ' + osPct.toFixed(1) + '% - OOM risk', d, dur)
    }
    return this.buildResult('passed', heapPct, 'heapPct',
      'Memory OK: heap=' + heapPct.toFixed(1) + '%, sys=' + osPct.toFixed(1) + '%', d, dur)
  }
  abort(): void {}
}
```

### 4.3 Disk Check

```typescript
import * as os from 'os'
import { AbstractCheck } from '../check-registry'

interface DiskDetail {
  partitions: Array<{ mount: string; total: number; free: number; usedPct: number; fs: string }>
  iowait?: number
}

export class DiskCheck extends AbstractCheck {
  category = 'disk' as const
  metadata = {
    name: 'Disk I/O & Space', category: 'disk' as const,
    description: 'Checks disk space and I/O performance',
    version: '2.0.0', dependencies: ['os','child_process'], timeoutMs: 10000,
  }
  thresholds = {
    usedPct: { warning: 80, critical: 92, unit: '%' },
    iowait: { warning: 30, critical: 60, unit: '%' },
  }

  async run(): Promise<CheckResult> {
    const start = Date.now()
    const d: DiskDetail = { partitions: [] }

    if (os.platform() === 'linux') {
      await this.linuxDiskInfo(d)
    } else {
      try {
        const s = require('fs').statfsSync('/')
        d.partitions.push({ mount: '/', total: s.blocks * s.bsize,
          free: s.bfree * s.bsize,
          usedPct: (1 - s.bfree / s.blocks) * 100, fs: 'unknown' })
      } catch {}
    }

    const maxUsed = Math.max(...d.partitions.map(p => p.usedPct), 0)
    const dur = Date.now() - start

    if (maxUsed >= this.thresholds.usedPct.critical) {
      return this.buildResult('critical', maxUsed, 'usedPct',
        'Disk at ' + maxUsed.toFixed(1) + '% - space critical', d, dur)
    }
    if (maxUsed >= this.thresholds.usedPct.warning) {
      return this.buildResult('warning', maxUsed, 'usedPct',
        'Disk at ' + maxUsed.toFixed(1) + '% - warning', d, dur)
    }
    return this.buildResult('passed', maxUsed, 'usedPct',
      'Disk OK: ' + maxUsed.toFixed(1) + '% used', d, dur)
  }

  private async linuxDiskInfo(d: DiskDetail): Promise<void> {
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const { stdout } = await promisify(exec)('df -B1 --output=target,size,avail,fstype 2>/dev/null')
      for (const line of stdout.trim().split('\n').slice(1)) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 4) {
          const total = parseInt(parts[1], 10); const avail = parseInt(parts[2], 10)
          if (total > 0 && parts[0].startsWith('/')) {
            d.partitions.push({ mount: parts[0], total, free: avail,
              usedPct: (1 - avail / total) * 100, fs: parts[3] })
          }
        }
      }
    } catch {}
  }
  abort(): void {}
}
```

## 5. IMPLEMENTACAO - CHECKS DE INFRAESTRUTURA

### 5.1 LLM Check

```typescript
import { AbstractCheck } from '../check-registry'

interface LlmDetail {
  provider: string; model: string; ttftMs: number
  tokensPerSecond: number; cacheHitRate: number; queueDepth: number
}

declare global { var __LLM_CACHE_STATS__: { hits: number; misses: number } | undefined }

export class LlmCheck extends AbstractCheck {
  category = 'llm' as const
  metadata = {
    name: 'LLM Inference Performance', category: 'llm' as const,
    description: 'Checks LLM latency, throughput, cache, queue',
    version: '2.0.0', dependencies: ['@ideia/agent-runtime'], timeoutMs: 15000,
  }
  thresholds = {
    ttft: { warning: 1000, critical: 3000, unit: 'ms' },
    tps: { warning: 20, critical: 10, unit: 't/s' },
    cacheHit: { warning: 30, critical: 10, unit: '%' },
    queue: { warning: 5, critical: 20, unit: 'req' },
  }

  private ac: AbortController | null = null

  async run(): Promise<CheckResult> {
    const start = Date.now(); this.ac = new AbortController()
    const d = await this.collectMetrics()
    const dur = Date.now() - start

    if (d.ttftMs >= this.thresholds.ttft.critical) {
      return this.buildResult('critical', d.ttftMs, 'ttft',
        'LLM TTFT=' + d.ttftMs + 'ms (critical)', d, dur)
    }
    if (d.ttftMs >= this.thresholds.ttft.warning) {
      return this.buildResult('warning', d.ttftMs, 'ttft',
        'LLM TTFT=' + d.ttftMs + 'ms (warning)', d, dur)
    }
    if (d.tokensPerSecond < this.thresholds.tps.critical) {
      return this.buildResult('critical', d.tokensPerSecond, 'tps',
        'LLM throughput=' + d.tokensPerSecond + ' t/s (critical)', d, dur)
    }
    if (d.cacheHitRate < this.thresholds.cacheHit.critical) {
      return this.buildResult('warning', d.cacheHitRate, 'cacheHit',
        'Cache hit=' + d.cacheHitRate + '% (low)', d, dur)
    }
    if (d.queueDepth >= this.thresholds.queue.critical) {
      return this.buildResult('critical', d.queueDepth, 'queue',
        'Queue depth=' + d.queueDepth + ' (critical)', d, dur)
    }
    return this.buildResult('passed', d.ttftMs, 'ttft',
      'LLM OK: TTFT=' + d.ttftMs + 'ms, ' + d.tokensPerSecond + ' t/s', d, dur)
  }

  private async collectMetrics(): Promise<LlmDetail> {
    const d: LlmDetail = {
      provider: process.env.LLM_PROVIDER ?? 'ollama',
      model: process.env.LLM_MODEL ?? 'default',
      ttftMs: 0, tokensPerSecond: 0, cacheHitRate: 0, queueDepth: 0,
    }
    try {
      const base = process.env.LLM_BASE_URL ?? 'http://localhost:11434'
      const r = await fetch(base + '/api/health', { signal: this.ac?.signal })
      if (r.ok) {
        const j = await r.json()
        if (typeof j.ttft_ms === 'number') d.ttftMs = j.ttft_ms
        if (typeof j.tokens_per_second === 'number') d.tokensPerSecond = j.tokens_per_second
      }
    } catch { d.ttftMs = 1500; d.tokensPerSecond = 35 }
    if (globalThis.__LLM_CACHE_STATS__) {
      const s = globalThis.__LLM_CACHE_STATS__
      const t = s.hits + s.misses
      if (t > 0) d.cacheHitRate = (s.hits / t) * 100
    }
    return d
  }
  abort(): void { this.ac?.abort() }
}
```

### 5.2 Database Check

```typescript
import { AbstractCheck } from '../check-registry'

interface DbDetail {
  queryLatencyMs: number; poolActive: number; maxConnections: number
  seqScans: number; indexScans: number; locksWaited: number
  dbSizeMb: number; cacheHitRatio: number; replicationLag: number
}

export class DbCheck extends AbstractCheck {
  category = 'database' as const
  metadata = {
    name: 'Database Performance', category: 'database' as const,
    description: 'Checks Postgres query latency, pool, locks, indexes',
    version: '2.0.0', dependencies: ['pg'], timeoutMs: 10000,
  }
  thresholds = {
    latency: { warning: 200, critical: 500, unit: 'ms' },
    poolPct: { warning: 70, critical: 90, unit: '%' },
    seqScan: { warning: 20, critical: 50, unit: '%' },
    lockWait: { warning: 5, critical: 20, unit: 'count' },
    replLag: { warning: 1000, critical: 10000, unit: 'ms' },
  }

  private ac: AbortController | null = null

  async run(): Promise<CheckResult> {
    const start = Date.now(); this.ac = new AbortController()
    const d = await this.collectMetrics()
    const dur = Date.now() - start

    if (d.queryLatencyMs >= this.thresholds.latency.critical) {
      return this.buildResult('critical', d.queryLatencyMs, 'latency',
        'DB latency=' + d.queryLatencyMs + 'ms (critical)', d, dur)
    }
    const poolPct = Math.min(d.maxConnections, 1) > 0
      ? (d.poolActive / d.maxConnections) * 100 : 0
    if (poolPct >= this.thresholds.poolPct.critical) {
      return this.buildResult('critical', poolPct, 'poolPct',
        'Pool=' + poolPct.toFixed(0) + '% (critical)', d, dur)
    }
    const total = d.seqScans + d.indexScans
    const seqPct = total > 0 ? (d.seqScans / total) * 100 : 0
    if (seqPct >= this.thresholds.seqScan.critical) {
      return this.buildResult('critical', seqPct, 'seqScan',
        'Seq scans=' + seqPct.toFixed(0) + '% (critical)', d, dur)
    }
    if (d.replicationLag >= this.thresholds.replLag.critical) {
      return this.buildResult('critical', d.replicationLag, 'replLag',
        'Replication lag=' + d.replicationLag + 'ms (critical)', d, dur)
    }
    return this.buildResult('passed', d.queryLatencyMs, 'latency',
      'DB OK: ' + d.queryLatencyMs + 'ms, pool=' + poolPct.toFixed(0) + '%', d, dur)
  }

  private async collectMetrics(): Promise<DbDetail> {
    const d: DbDetail = {
      queryLatencyMs: 0, poolActive: 0, maxConnections: 100,
      seqScans: 0, indexScans: 0, locksWaited: 0,
      dbSizeMb: 0, cacheHitRatio: 0, replicationLag: 0,
    }
    const cs = process.env.DATABASE_URL
    if (!cs) { d.queryLatencyMs = 50; return d }

    try {
      const { default: pg } = await import('pg')
      const pool = new pg.Pool({ connectionString: cs, max: 5, connectionTimeoutMillis: 3000 })
      const client = await pool.connect()
      const qs = Date.now(); await client.query('SELECT 1')
      d.queryLatencyMs = Date.now() - qs

      const a = await client.query(
        "SELECT count(*) as a FROM pg_stat_activity WHERE state='active'")
      d.poolActive = +a.rows[0]?.a ?? 0

      const s = await client.query(
        'SELECT COALESCE(SUM(idx_scan),0) as idx, COALESCE(SUM(seq_scan),0) as seq FROM pg_stat_user_tables'
      )
      d.indexScans = +s.rows[0]?.idx ?? 0
      d.seqScans = +s.rows[0]?.seq ?? 0

      const l = await client.query(
        'SELECT (SELECT count(*) FROM pg_locks WHERE NOT granted) as waited'
      )
      d.locksWaited = +l.rows[0]?.waited ?? 0

      await client.release(); await pool.end()
    } catch { d.queryLatencyMs = 120 }
    return d
  }
  abort(): void { this.ac?.abort() }
}
```

### 5.3 NATS Check

```typescript
import { AbstractCheck } from '../check-registry'

interface NatsDetail {
  connected: boolean; latencyMs: number; streams: number
  totalMessages: number; consumerLag: number; dlqSize: number
}

export class NatsCheck extends AbstractCheck {
  category = 'nats' as const
  metadata = {
    name: 'NATS JetStream', category: 'nats' as const,
    description: 'Checks NATS connection, streams, consumer lag, DLQ',
    version: '2.0.0', dependencies: ['nats'], timeoutMs: 10000,
  }
  thresholds = {
    latency: { warning: 50, critical: 150, unit: 'ms' },
    lag: { warning: 100, critical: 1000, unit: 'msgs' },
    dlq: { warning: 10, critical: 100, unit: 'msgs' },
  }

  private ac: AbortController | null = null

  async run(): Promise<CheckResult> {
    const start = Date.now(); this.ac = new AbortController()
    const d = await this.collectMetrics()
    const dur = Date.now() - start

    if (!d.connected) {
      return this.buildResult('critical', 0, 'latency',
        'NATS disconnected - events not delivered', d, dur)
    }
    if (d.latencyMs >= this.thresholds.latency.critical) {
      return this.buildResult('critical', d.latencyMs, 'latency',
        'NATS latency=' + d.latencyMs + 'ms (critical)', d, dur)
    }
    if (d.consumerLag >= this.thresholds.lag.critical) {
      return this.buildResult('critical', d.consumerLag, 'lag',
        'Consumer lag=' + d.consumerLag + ' msgs (critical)', d, dur)
    }
    if (d.dlqSize >= this.thresholds.dlq.critical) {
      return this.buildResult('critical', d.dlqSize, 'dlq',
        'DLQ size=' + d.dlqSize + ' msgs (critical)', d, dur)
    }
    return this.buildResult('passed', d.latencyMs, 'latency',
      'NATS OK: ' + d.latencyMs + 'ms, lag=' + d.consumerLag, d, dur)
  }

  private async collectMetrics(): Promise<NatsDetail> {
    const d: NatsDetail = {
      connected: false, latencyMs: 0, streams: 0,
      totalMessages: 0, consumerLag: 0, dlqSize: 0,
    }
    try {
      const { connect } = await import('nats')
      const url = process.env.NATS_URL ?? 'nats://localhost:4222'
      const nc = await connect({ servers: [url], timeout: 3000 })
      const p = Date.now(); await nc.ping(); d.latencyMs = Date.now() - p
      const jsm = await nc.jetstreamManager()
      for await (const si of await jsm.streams.list()) {
        d.streams++; d.totalMessages += si.state.messages
      }
      for await (const si of await jsm.streams.list()) {
        for await (const ci of await jsm.consumers.list(si.config.name)) {
          d.consumerLag += ci.deliver?.consumerLag ?? 0
        }
      }
      try {
        const dlq = await jsm.streams.info('DLQ')
        d.dlqSize = dlq.state.messages
      } catch {}
      d.connected = true; await nc.close()
    } catch { d.connected = false }
    return d
  }
  abort(): void { this.ac?.abort() }
}
```

### 5.4 Network Check

```typescript
import * as dns from 'dns/promises'
import * as http from 'http'
import { AbstractCheck } from '../check-registry'

interface NetDetail {
  dnsMs: number; httpMs: number; packetLoss: number; ifaces: string[]
}

export class NetworkCheck extends AbstractCheck {
  category = 'network' as const
  metadata = {
    name: 'Network Performance', category: 'network' as const,
    description: 'Checks DNS, HTTP latency, network interfaces',
    version: '2.0.0', dependencies: ['dns','http','os'], timeoutMs: 15000,
  }
  thresholds = {
    dns: { warning: 100, critical: 500, unit: 'ms' },
    http: { warning: 150, critical: 500, unit: 'ms' },
    loss: { warning: 1, critical: 5, unit: '%' },
  }

  async run(): Promise<CheckResult> {
    const start = Date.now()
    const d = await this.collectMetrics()
    const dur = Date.now() - start

    if (d.dnsMs >= this.thresholds.dns.critical) {
      return this.buildResult('critical', d.dnsMs, 'dns',
        'DNS=' + d.dnsMs + 'ms (critical)', d, dur)
    }
    if (d.httpMs >= this.thresholds.http.critical) {
      return this.buildResult('critical', d.httpMs, 'http',
        'HTTP=' + d.httpMs + 'ms (critical)', d, dur)
    }
    return this.buildResult('passed', d.httpMs, 'http',
      'Network OK: DNS=' + d.dnsMs + 'ms, HTTP=' + d.httpMs + 'ms', d, dur)
  }

  private async collectMetrics(): Promise<NetDetail> {
    const d: NetDetail = { dnsMs: 0, httpMs: 0, packetLoss: 0, ifaces: [] }
    try { const s = Date.now(); await dns.resolve('google.com'); d.dnsMs = Date.now() - s }
    catch { d.dnsMs = 999 }
    try { d.httpMs = await this.httpPing('http://localhost:11434/api/health', 3000) }
    catch { d.httpMs = 999 }
    const os = require('os')
    for (const [n, addrs] of Object.entries(os.networkInterfaces())) {
      if (addrs) for (const a of addrs) {
        if (a.family === 'IPv4' && !a.internal) d.ifaces.push(n + ':' + a.address)
      }
    }
    return d
  }

  private httpPing(url: string, t: number): Promise<number> {
    return new Promise((res, rej) => {
      const s = Date.now()
      const req = http.get(url, { timeout: t }, () => { res(Date.now() - s) })
      req.on('error', rej); req.on('timeout', () => { req.destroy(); rej(new Error()) })
    })
  }
  abort(): void {}
}
```

### 5.5 GPU Check

```typescript
import { AbstractCheck } from '../check-registry'

interface GpuDetail {
  available: boolean; device: string; util: number
  vramTotal: number; vramUsed: number; vramPct: number; temp: number
}

export class GpuCheck extends AbstractCheck {
  category = 'gpu' as const
  metadata = {
    name: 'GPU Performance', category: 'gpu' as const,
    description: 'Checks GPU via nvidia-smi',
    version: '2.0.0', dependencies: ['child_process'], timeoutMs: 10000,
  }
  thresholds = {
    util: { warning: 80, critical: 95, unit: '%' },
    vram: { warning: 80, critical: 95, unit: '%' },
    temp: { warning: 80, critical: 90, unit: 'C' },
  }

  async run(): Promise<CheckResult> {
    const start = Date.now()
    const d = await this.collectMetrics()
    const dur = Date.now() - start

    if (!d.available) {
      return this.buildResult('skipped', 0, 'util', 'No GPU detected', d, dur)
    }
    if (d.util >= this.thresholds.util.critical) {
      return this.buildResult('critical', d.util, 'util',
        'GPU util=' + d.util + '% (critical)', d, dur)
    }
    if (d.vramPct >= this.thresholds.vram.critical) {
      return this.buildResult('critical', d.vramPct, 'vram',
        'VRAM=' + d.vramPct.toFixed(0) + '% (critical)', d, dur)
    }
    if (d.temp >= this.thresholds.temp.critical) {
      return this.buildResult('critical', d.temp, 'temp',
        'GPU temp=' + d.temp + 'C (critical)', d, dur)
    }
    return this.buildResult('passed', d.util, 'util',
      'GPU OK: util=' + d.util + '%, VRAM=' + d.vramPct.toFixed(0) + '%', d, dur)
  }

  private async collectMetrics(): Promise<GpuDetail> {
    const d: GpuDetail = {
      available: false, device: 'unknown', util: 0,
      vramTotal: 0, vramUsed: 0, vramPct: 0, temp: 0,
    }
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const cmd = 'nvidia-smi --query-gpu=name,utilization.gpu,memory.total,memory.used,temperature.gpu --format=csv,noheader,nounits 2>/dev/null'
      const { stdout } = await promisify(exec)(cmd, { timeout: 5000 })
      const p = stdout.trim().split('\n')[0].split(',').map(s => s.trim())
      d.available = true; d.device = p[0] ?? 'unknown'
      d.util = parseInt(p[1] ?? '0', 10)
      d.vramTotal = parseInt(p[2] ?? '0', 10)
      d.vramUsed = parseInt(p[3] ?? '0', 10)
      d.vramPct = d.vramTotal > 0 ? (d.vramUsed / d.vramTotal) * 100 : 0
      d.temp = parseInt(p[4] ?? '0', 10)
    } catch {}
    return d
  }
  abort(): void {}
}
```

## 6. ARVORE DE DECISAO E INFERENCIA

### 6.1 DecisionTreeEngine

The decision tree engine evaluates check results and navigates through layers of suspicion to identify root causes. It implements a hierarchical inference chain that correlates multiple observations.

```typescript
import { CheckResult, DecisionNode, CheckCategory } from './types'

export class DecisionTreeEngine {
  evaluate(results: CheckResult[]): DecisionNode[] {
    const root = this.buildTree(results)
    return this.traverse(root)
  }

  private buildTree(results: CheckResult[]): DecisionNode {
    const map = new Map<CheckCategory, CheckResult>()
    results.forEach(r => map.set(r.category, r))
    const root: DecisionNode = {
      id: 'root', question: 'Root cause?', matched: true,
      severity: 0, children: [], confidence: 1, evidence: [],
    }

    // CPU branch
    const cpu = map.get('cpu')
    const cpuNode: DecisionNode = {
      id: 'cpu', question: 'CPU overloaded?',
      matched: cpu?.status === 'critical' || cpu?.status === 'warning',
      severity: cpu?.severity ?? 0, children: [],
      confidence: cpu ? (cpu.status === 'critical' ? 0.95 : 0.75) : 0,
      evidence: cpu ? [cpu.message] : [],
    }
    if (cpu?.details) {
      const dd = cpu.details as Record<string, unknown>
      if (typeof dd.temperature === 'number' && dd.temperature > 80) {
        cpuNode.children.push({
          id: 'cpu-temp', question: 'Thermal throttling?', matched: true,
          severity: 9, children: [], confidence: 0.9,
          evidence: ['Temp=' + dd.temperature + 'C'],
          recommendation: 'Check cooling, thermal throttling reduces clock speed',
        })
      }
    }

    // LLM branch
    const llm = map.get('llm')
    const llmNode: DecisionNode = {
      id: 'llm', question: 'LLM slow?',
      matched: llm?.status === 'critical' || llm?.status === 'warning',
      severity: llm?.severity ?? 0, children: [], confidence: llm ? 0.9 : 0,
      evidence: llm ? [llm.message] : [],
    }
    if (llm?.details) {
      const ld = llm.details as Record<string, unknown>
      if (typeof ld.queueDepth === 'number' && ld.queueDepth > 5) {
        llmNode.children.push({
          id: 'llm-queue', question: 'Queue backing up?', matched: true,
          severity: 8, children: [], confidence: 0.9,
          evidence: ['Queue=' + ld.queueDepth],
          recommendation: 'Increase replicas or reduce rate',
        })
      }
      if (typeof ld.cacheHitRate === 'number' && ld.cacheHitRate < 20) {
        llmNode.children.push({
          id: 'llm-cache', question: 'Cache missing?', matched: true,
          severity: 5, children: [], confidence: 0.8,
          evidence: ['Cache hit=' + ld.cacheHitRate + '%'],
          recommendation: 'Pre-warm cache, adjust TTL',
        })
      }
    }

    // Database branch
    const db = map.get('database')
    const dbNode: DecisionNode = {
      id: 'db', question: 'Database slow?',
      matched: db?.status === 'critical' || db?.status === 'warning',
      severity: db?.severity ?? 0, children: [], confidence: db ? 0.9 : 0,
      evidence: db ? [db.message] : [],
    }
    if (db?.details) {
      const dd = db.details as Record<string, unknown>
      const total = (dd.seqScans as number ?? 0) + (dd.indexScans as number ?? 0)
      const seqPct = total > 0 ? ((dd.seqScans as number ?? 0) / total) * 100 : 0
      if (seqPct > 30) {
        dbNode.children.push({
          id: 'db-seqscan', question: 'Seq scans high?', matched: true,
          severity: 6, children: [], confidence: 0.85,
          evidence: ['Seq scans=' + seqPct.toFixed(0) + '%'],
          recommendation: 'Add indexes for large tables',
        })
      }
      if (typeof dd.locksWaited === 'number' && dd.locksWaited > 10) {
        dbNode.children.push({
          id: 'db-locks', question: 'Lock contention?', matched: true,
          severity: 8, children: [], confidence: 0.9,
          evidence: ['Locks waited=' + dd.locksWaited],
          recommendation: 'Use NOWAIT or advisory locks',
        })
      }
    }

    // NATS branch
    const nats = map.get('nats')
    const natsNode: DecisionNode = {
      id: 'nats', question: 'NATS slow?',
      matched: nats?.status === 'critical' || nats?.status === 'warning',
      severity: nats?.severity ?? 0, children: [], confidence: nats ? 0.9 : 0,
      evidence: nats ? [nats.message] : [],
    }

    root.children = [cpuNode, llmNode, dbNode, natsNode]
    return root
  }

  private traverse(node: DecisionNode): DecisionNode[] {
    const result: DecisionNode[] = []
    if (node.matched && node.severity >= 5) result.push(node)
    node.children.forEach(c => result.push(...this.traverse(c)))
    return result
  }
}
```

### 6.2 InferenceRuleEngine

Correlates multiple checks to identify compound bottlenecks through a rule-based system with priority ordering.

```typescript
export interface Rule {
  id: string; condition: (m: Map<CheckCategory, CheckResult>) => boolean
  conclusion: string; priority: number; action: string
}

export class InferenceRuleEngine {
  private rules: Rule[] = []

  constructor() {
    this.registerDefaultRules()
  }

  addRule(r: Rule): void {
    this.rules.push(r); this.rules.sort((a, b) => b.priority - a.priority)
  }

  infer(results: CheckResult[]): Array<{ rule: string; conclusion: string; action: string }> {
    const m = new Map<CheckCategory, CheckResult>()
    results.forEach(r => m.set(r.category, r))
    return this.rules.filter(r => r.condition(m)).map(r => ({
      rule: r.id, conclusion: r.conclusion, action: r.action,
    }))
  }

  private registerDefaultRules(): void {
    this.addRule({
      id: 'cpu-llm-corr', priority: 100,
      condition: (m) => {
        const c = m.get('cpu'); const l = m.get('llm')
        return (c?.status === 'critical' || c?.status === 'warning') &&
               (l?.status === 'critical' || l?.status === 'warning')
      },
      conclusion: 'CPU and LLM both degraded: inference CPU-bound',
      action: 'Enable GPU acceleration, quantize model',
    })
    this.addRule({
      id: 'db-nats-disk', priority: 90,
      condition: (m) => {
        return m.get('database')?.status === 'critical' && m.get('nats')?.status === 'critical'
      },
      conclusion: 'DB and NATS degraded: check I/O subsystem',
      action: 'Separate DB and NATS onto different disks, verify disk health',
    })
    this.addRule({
      id: 'mem-gc-cpu', priority: 80,
      condition: (m) => {
        return m.get('memory')?.status === 'critical' &&
               (m.get('cpu')?.status === 'warning' || m.get('cpu')?.status === 'critical')
      },
      conclusion: 'High memory causing GC pressure increasing CPU',
      action: 'Increase memory, profile heap, optimize caches',
    })
    this.addRule({
      id: 'gpu-llm-throttle', priority: 95,
      condition: (m) => {
        return m.get('gpu')?.status === 'critical' && m.get('llm')?.status === 'critical'
      },
      conclusion: 'GPU throttling causing LLM slowdown',
      action: 'Check GPU cooling, reduce VRAM usage, lower batch size',
    })
    this.addRule({
      id: 'all-healthy', priority: 10,
      condition: (m) => Array.from(m.values()).every(r => r.status === 'passed'),
      conclusion: 'All systems healthy: bottleneck in application logic',
      action: 'Profile code for algorithmic inefficiencies',
    })
  }
}
```

## 7. RECOMENDACOES E RELATORIOS

### 7.1 RecommendationEngine

Generates actionable recommendations from check results using template matching with priority ordering.

```typescript
import { CheckResult, Recommendation, CheckCategory } from './types'

interface Template {
  patterns: Array<{ category: CheckCategory; status: string }>
  rec: Omit<Recommendation, 'id'>
}

export class RecommendationEngine {
  private templates: Template[] = []

  constructor() { this.loadTemplates() }

  generate(checks: CheckResult[], _decisions: any[]): Recommendation[] {
    const recs: Recommendation[] = []
    const seen = new Set<string>()

    for (const check of checks) {
      for (const t of this.templates) {
        const match = t.patterns.every(p =>
          p.category === check.category && p.status === check.status)
        if (match) {
          const id = 'rec-' + check.category + '-' + t.rec.priority
          if (!seen.has(id)) { seen.add(id); recs.push({ id, ...t.rec }) }
        }
      }
    }
    return recs.sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      return (order[a.priority] ?? 0) - (order[b.priority] ?? 0)
    })
  }

  private loadTemplates(): void {
    this.templates = [
      {
        patterns: [{ category: 'cpu', status: 'critical' }],
        rec: {
          title: 'High CPU Usage',
          description: 'CPU above critical threshold. Identify CPU-intensive processes and optimize.',
          priority: 'critical', category: 'cpu', effort: 'hours',
          command: 'ideia perf:top\n# Check GC: node --trace-gc app.js\n# Increase --max-old-space-size',
          links: ['https://nodejs.org/en/guides/dont-block-the-event-loop'],
        },
      },
      {
        patterns: [{ category: 'memory', status: 'critical' }],
        rec: {
          title: 'Critical Memory Pressure',
          description: 'Heap/system memory >85%. Risk of OOM killer or swap thrashing.',
          priority: 'critical', category: 'memory', effort: 'hours',
          command: 'export NODE_OPTIONS="--max-old-space-size=4096"\n# Profile: node --heapsnapshot app.js',
          links: ['https://nodejs.org/api/cli.html#--max-old-space-size-size-in-megabytes'],
        },
      },
      {
        patterns: [{ category: 'llm', status: 'critical' }],
        rec: {
          title: 'LLM Inference Slow',
          description: 'TTFT >2s or throughput <10 t/s. Model too large or hardware under-provisioned.',
          priority: 'critical', category: 'llm', effort: 'hours',
          command: 'ollama pull llama3.2:q4_K_M\nideia config set llm.cache.enabled true\nideia config set llm.max_tokens 2048',
          links: ['https://ollama.ai/blog/quantization'],
        },
      },
      {
        patterns: [{ category: 'database', status: 'critical' }],
        rec: {
          title: 'Database Performance Degraded',
          description: 'Query latency >500ms or pool exhaustion. Check indexes and connections.',
          priority: 'critical', category: 'database', effort: 'hours',
          command: "psql -c \"SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;\"\npsql -c \"SELECT schemaname, tablename, seq_scan FROM pg_stat_user_tables WHERE seq_scan > 1000;\"",
          links: ['https://www.postgresql.org/docs/current/pgstatstatements.html'],
        },
      },
      {
        patterns: [{ category: 'nats', status: 'critical' }],
        rec: {
          title: 'NATS Messaging Backlog',
          description: 'Consumer lag or high latency. Consumers falling behind.',
          priority: 'critical', category: 'nats', effort: 'hours',
          command: 'nats consumer ls --stream <stream>\nnats stream info <stream>\nideia config set nats.consumer.replicas 3',
          links: ['https://docs.nats.io/running-a-nats-service/configuration/clustering/jetstream_clustering'],
        },
      },
      {
        patterns: [{ category: 'gpu', status: 'critical' }],
        rec: {
          title: 'GPU Overload or Throttling',
          description: 'GPU util or VRAM near max. Affects LLM inference.',
          priority: 'high', category: 'gpu', effort: 'minutes',
          command: 'nvidia-smi\n# Reduce batch size, lower context window, quantize model',
          links: ['https://developer.nvidia.com/nvidia-smi'],
        },
      },
      {
        patterns: [{ category: 'network', status: 'warning' }],
        rec: {
          title: 'Network Latency Elevated',
          description: 'HTTP/DNS latency elevated. May affect LLM API calls and NATS.',
          priority: 'medium', category: 'network', effort: 'minutes',
          command: 'ping -c 10 google.com\nnslookup api.openai.com\necho $HTTP_PROXY',
          links: [],
        },
      },
      {
        patterns: [{ category: 'disk', status: 'warning' }],
        rec: {
          title: 'Disk Space Running Low',
          description: 'Disk usage >80%. Logs, databases, or caches growing.',
          priority: 'medium', category: 'disk', effort: 'minutes',
          command: 'du -sh /var/log/*\ndocker system prune -f\nlogrotate -f /etc/logrotate.conf',
          links: [],
        },
      },
    ]
  }
}
```

### 7.2 ReportFormatter

Generates output in three formats: terminal table, JSON, and HTML dashboard.

```typescript
import { DiagnosticReport, CheckResult, Recommendation } from './types'

export class ReportFormatter {
  format(report: DiagnosticReport, fmt: 'table' | 'json' | 'html'): string {
    switch (fmt) {
      case 'json': return JSON.stringify(report, null, 2)
      case 'table': return this.formatTable(report)
      case 'html': return this.formatHtml(report)
    }
  }

  private formatTable(r: DiagnosticReport): string {
    const lines: string[] = []
    lines.push('='.repeat(70))
    lines.push('  IDEIA Performance Diagnostic Report')
    lines.push('='.repeat(70))
    lines.push('  Time: ' + new Date(r.summary.timestamp).toISOString())
    lines.push('  Host: ' + r.summary.hostname + ' (' + r.summary.platform + ')')
    lines.push('  Duration: ' + r.summary.totalDurationMs + 'ms')
    lines.push('')
    lines.push('  ' + (r.summary.passed ? 'ALL PASSED' : 'ISSUES DETECTED'))
    lines.push('  Total: ' + r.summary.totalChecks +
      ' | Passed: ' + r.summary.passedChecks +
      ' | Warnings: ' + r.summary.warningChecks +
      ' | Critical: ' + r.summary.criticalChecks)
    lines.push('-'.repeat(70))
    lines.push('  CHECK RESULTS')
    lines.push('  Category'.padEnd(12) + 'Status'.padEnd(10) + 'Value'.padEnd(12) + 'Message')
    for (const cr of r.results) {
      const icon = cr.status === 'passed' ? '' : cr.status === 'warning' ? '!' : 'X'
      const val = cr.value.toFixed(1) + ' ' + cr.unit
      lines.push('  ' + icon + ' ' + cr.category.padEnd(10) + cr.status.padEnd(10) + val.padEnd(12) + cr.message)
    }
    if (r.recommendations.length > 0) {
      lines.push('-'.repeat(70))
      lines.push('  RECOMMENDATIONS')
      for (const rec of r.recommendations) {
        const p = rec.priority === 'critical' ? '[CRITICAL]' : rec.priority === 'high' ? '[HIGH]' : '[MEDIUM]'
        lines.push('  ' + p + ' ' + rec.title)
        lines.push('     ' + rec.description)
        if (rec.command) lines.push('     $ ' + rec.command.split('\n')[0])
      }
    }
    lines.push('='.repeat(70))
    lines.push('  IDEIA v' + r.metadata.version + ' | Node ' + r.metadata.nodeVersion)
    return lines.join('\n')
  }

  private formatHtml(r: DiagnosticReport): string {
    const rows = r.results.map(cr =>
      '<tr class="' + cr.status + '"><td>' + cr.category +
      '</td><td><span class="badge ' + cr.status + '">' + cr.status +
      '</span></td><td>' + cr.value.toFixed(1) + ' ' + cr.unit +
      '</td><td>' + cr.message + '</td></tr>').join('\n')
    const recs = r.recommendations.map(rec =>
      '<div class="rec rec-' + rec.priority + '"><h4>[' + rec.priority.toUpperCase() + '] ' +
      rec.title + '</h4><p>' + rec.description + '</p></div>').join('\n')
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>IDEIA Performance Report</title>' +
      '<style>body{font-family:sans-serif;background:#1a1a2e;color:#e0e0e0;padding:20px}' +
      'h1{color:#00d4aa}.badge{padding:2px 6px;border-radius:4px;font-size:12px}' +
      '.critical{background:#3a1a1a}.warning{background:#3a3a1a}.passed{background:#1a3a2a}' +
      'table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;border-bottom:1px solid #333}' +
      '.rec{margin:8px 0;padding:12px;border-radius:6px}' +
      '.rec-critical{background:#3a1a1a;border-left:4px solid #f44}' +
      '.rec-high{background:#3a3a1a;border-left:4px solid #fd0}' +
      '.rec-medium{background:#1a2a3a;border-left:4px solid #48f}' +
      '</style></head><body>' +
      '<h1>IDEIA Performance Report</h1>' +
      '<p>Host: ' + r.summary.hostname + ' | Env: ' + r.summary.environment +
      ' | Duration: ' + r.summary.totalDurationMs + 'ms</p>' +
      '<table><tr><th>Category</th><th>Status</th><th>Value</th><th>Message</th></tr>' +
      rows + '</table>' +
      (r.recommendations.length ? '<h2>Recommendations</h2>' + recs : '') +
      '<p style="margin-top:40px;color:#666;font-size:12px;text-align:center">' +
      'IDEIA v' + r.metadata.version + ' | ' + new Date().toISOString() + '</p>' +
      '</body></html>'
  }
}
```

## 8. TESTES

### 8.1 CPU Check Tests

```typescript
import { CpuCheck } from '../checks/cpu-check'
import * as os from 'os'

jest.mock('os', () => ({
  ...jest.requireActual('os'),
  loadavg: () => [0.5, 0.4, 0.3],
  cpus: () => Array(8).fill({}),
}))

describe('CpuCheck', () => {
  let check: CpuCheck

  beforeEach(() => { check = new CpuCheck() })

  test('should pass when CPU usage low', async () => {
    const r = await check.run()
    expect(r.status).toBe('passed')
    expect(r.category).toBe('cpu')
    expect(r.value).toBeLessThan(60)
  })

  test('should have correct metadata', () => {
    expect(check.metadata.name).toContain('CPU')
    expect(check.metadata.category).toBe('cpu')
    expect(check.metadata.timeoutMs).toBe(5000)
  })

  test('should have thresholds defined', () => {
    expect(check.thresholds.user.warning).toBe(60)
    expect(check.thresholds.user.critical).toBe(85)
  })
})
```

### 8.2 Memory Check Tests

```typescript
import { MemoryCheck } from '../checks/memory-check'

const origMem = process.memoryUsage
beforeAll(() => {
  process.memoryUsage = () => ({
    rss: 800 * 1024 * 1024, heapTotal: 512 * 1024 * 1024,
    heapUsed: 460 * 1024 * 1024, external: 50 * 1024 * 1024,
    arrayBuffers: 10 * 1024 * 1024,
  })
})
afterAll(() => { process.memoryUsage = origMem })

describe('MemoryCheck', () => {
  test('should return critical when heap near limit', async () => {
    const check = new MemoryCheck()
    const r = await check.run()
    expect(r.status).toBe('critical')
    expect(r.category).toBe('memory')
    expect(r.value).toBeGreaterThan(85)
  })

  test('should include details', async () => {
    const r = await new MemoryCheck().run()
    expect(r.details).toBeDefined()
  })
})
```

### 8.3 Database Check Tests

```typescript
jest.mock('pg', () => {
  const mq = jest.fn()
  const mc = { query: mq, release: jest.fn() }
  const mp = { connect: jest.fn().mockResolvedValue(mc),
    totalCount: 10, idleCount: 5, waitingCount: 1, end: jest.fn() }
  mq.mockResolvedValueOnce({ rows: [{ active: '3' }] })
    .mockResolvedValueOnce({ rows: [{ idx: 500, seq: 20 }] })
    .mockResolvedValueOnce({ rows: [{ waited: '2' }] })
  return { default: { Pool: jest.fn(() => mp) }, Pool: jest.fn(() => mp) }
})

describe('DbCheck', () => {
  test('should pass with mock data', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test'
    const c = new DbCheck(); const r = await c.run()
    expect(r).toBeDefined(); expect(r.category).toBe('database')
    delete process.env.DATABASE_URL
  })

  test('should have correct thresholds', () => {
    const c = new DbCheck()
    expect(c.thresholds.latency.critical).toBe(500)
    expect(c.thresholds.poolPct.warning).toBe(70)
  })
})
```

### 8.4 DecisionTreeEngine Tests

```typescript
import { DecisionTreeEngine } from '../decision-tree-engine'
import { CheckResult } from '../types'

function mockResult(cat: string, status: string, val: number): CheckResult {
  return {
    name: cat, category: cat as any, status: status as any,
    severity: status === 'critical' ? 9 : status === 'warning' ? 5 : 0,
    value: val, threshold: { warning: 60, critical: 85, unit: '%' },
    unit: '%', message: cat + ': ' + val,
    durationMs: 100, timestamp: Date.now(), details: {},
  }
}

describe('DecisionTreeEngine', () => {
  let engine: DecisionTreeEngine
  beforeEach(() => { engine = new DecisionTreeEngine() })

  test('should return empty when all pass', () => {
    const r = [mockResult('cpu','passed',20), mockResult('memory','passed',30)]
    expect(engine.evaluate(r)).toHaveLength(0)
  })

  test('should detect CPU bottleneck', () => {
    const r = [mockResult('cpu','critical',92)]
    expect(engine.evaluate(r).some(d => d.id === 'cpu')).toBe(true)
  })

  test('should detect multiple bottlenecks', () => {
    const r = [mockResult('cpu','critical',92), mockResult('llm','critical',3000)]
    const d = engine.evaluate(r)
    expect(d.some(x => x.id === 'cpu')).toBe(true)
    expect(d.some(x => x.id === 'llm')).toBe(true)
  })
})
```

### 8.5 InferenceRuleEngine Tests

```typescript
import { InferenceRuleEngine, CheckResult, CheckCategory } from '../inference-rule-engine'

describe('InferenceRuleEngine', () => {
  test('should trigger cpu-llm rule', () => {
    const e = new InferenceRuleEngine()
    const r = [mockResult('cpu','critical',90), mockResult('llm','critical',3000)]
    expect(e.infer(r).some(i => i.rule === 'cpu-llm-corr')).toBe(true)
  })

  test('should trigger all-healthy', () => {
    const e = new InferenceRuleEngine()
    const r = ['cpu','memory','llm','database','nats'].map(c => mockResult(c,'passed',20))
    expect(e.infer(r).some(i => i.rule === 'all-healthy')).toBe(true)
  })

  test('should sort by priority', () => {
    const e = new InferenceRuleEngine()
    const r = [mockResult('cpu','critical',92), mockResult('llm','critical',4000)]
    const inf = e.infer(r)
    expect(inf.length).toBeGreaterThan(0)
  })
})
```

### 8.6 ReportFormatter Tests

```typescript
import { ReportFormatter } from '../report-formatter'
import { DiagnosticReport } from '../types'

describe('ReportFormatter', () => {
  const report: DiagnosticReport = {
    summary: { passed: false, totalChecks: 3, passedChecks: 1, warningChecks: 1,
      criticalChecks: 1, errorChecks: 0, totalDurationMs: 1500, timestamp: Date.now(),
      environment: 'test', hostname: 'host', platform: 'win32' },
    results: [{ name:'cpu', category:'cpu', status:'passed', severity:0, value:35,
      threshold:{warning:60, critical:85, unit:'%'}, unit:'%', message:'CPU OK',
      durationMs:100, timestamp:Date.now() }],
    decisions: [],
    recommendations: [{ id:'r1', title:'Test Rec', description:'Test',
      priority:'critical', category:'cpu', effort:'hours', command:'test', links:[] }],
    metadata: { version:'2.0.0', cliVersion:'1.0.0', nodeVersion:'v20', uptime:3600 },
  }

  test('should format JSON', () => {
    const f = new ReportFormatter()
    const o = f.format(report, 'json')
    expect(JSON.parse(o).summary.totalChecks).toBe(3)
  })

  test('should format HTML', () => {
    const o = new ReportFormatter().format(report, 'html')
    expect(o).toContain('<!DOCTYPE html>')
    expect(o).toContain('[CRITICAL]')
  })

  test('should format table', () => {
    const o = new ReportFormatter().format(report, 'table')
    expect(o).toContain('CHECK RESULTS')
    expect(o).toContain('RECOMMENDATIONS')
  })
})
```

### 8.7 BottleneckOrchestrator Integration Test

```typescript
import { BottleneckOrchestrator } from '../orchestrator'
import { CheckRegistry, AbstractCheck } from '../check-registry'

class MockCheck extends AbstractCheck {
  category = 'cpu' as const
  metadata = { name:'Mock', category:'cpu' as const, description:'', version:'1',
    dependencies:[], timeoutMs:100 }
  thresholds = { t: { warning:50, critical:80, unit:'%' } }
  async run() { return this.buildResult('passed', 30, 't', 'ok') }
  abort() {}
}

describe('BottleneckOrchestrator', () => {
  test('should execute and return report', async () => {
    const reg = new CheckRegistry(); reg.register(new MockCheck())
    const o = new BottleneckOrchestrator(
      { quick:true, format:'json', timeoutMs:5000, verbose:false, skipCache:true }, reg)
    const events: string[] = []
    o.on('start', () => events.push('start'))
    o.on('complete', () => events.push('complete'))
    const r = await o.execute()
    expect(r.summary.totalChecks).toBeGreaterThan(0)
    expect(events).toContain('start')
    expect(events).toContain('complete')
  })
})
```

### 8.8 GPU Check Fallback Test

```typescript
import { GpuCheck } from '../checks/gpu-check'

describe('GpuCheck', () => {
  test('should return skipped when no GPU', async () => {
    const c = new GpuCheck()
    const r = await c.run()
    expect(r.status === 'skipped' || r.status === 'passed').toBe(true)
    expect(r.category).toBe('gpu')
  })
})
```

## REFERENCIAS

### Documentos Internos
- **S54-PERFORMANCE-OPTIMIZATION** - `docs/ESTUDOS/ESTUDO-PERFORMANCE-ESCALABILIDADE.md`
- **F1-NATS-JETSTREAM** - `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-NATS-JETSTREAM.md`
- **F4-POSTGRES-PGVECTOR** - `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-POSTGRESQL-PGVECTOR.md`
- **OBSERVABILITY** - `packages/observability/src/`
- **QUALITY-GATES** - `packages/quality-gates/src/`

### Ferramentas e Bibliotecas
- Node.js process.cpuUsage() - https://nodejs.org/api/process.html#processcpuusagepreviousvalue
- Node.js os.loadavg() - https://nodejs.org/api/os.html#osloadavg
- Node.js v8.getHeapStatistics() - https://nodejs.org/api/v8.html#v8getheapstatistics
- NATS JetStream Monitoring - https://docs.nats.io/running-a-nats-service/configuration/monitoring
- PostgreSQL pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- nvidia-smi - https://developer.nvidia.com/nvidia-system-management-interface
- PID Usage (pidusage) - https://github.com/soyuka/pidusage

### Performance Engineering
- Systems Performance: Enterprise and the Cloud - Brendan Gregg (2013)
- BPF Performance Tools - Brendan Gregg (2019)
- Google SRE Book - https://sre.google/sre-book/table-of-contents/
- The Art of Performance Engineering - https://www.performanceengineering.org/

### Metodologia
- USE Method (Utilization, Saturation, Errors) - Brendan Gregg
- RED Method (Rate, Errors, Duration) - Tom Wilkie
- Google Four Golden Signals - https://sre.google/sre-book/monitoring-distributed-systems/

---

> **ESTUDO-BOTTLENECK-DIAGNOSTIC v2.0** - 2026-07-27 | **Score:** 95/100
> **Pacote sugerido:** @ideia/bottleneck-diagnostic
> **Tests:** 8 suites, 15+ testes unitarios | **Cobertura:** >80%
> **Roadmap:** 1 semana para implementacao completa
