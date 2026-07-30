import { createHash, randomUUID } from 'crypto'
import { ConfigManager } from '@ideia/config-engine';
import { createLogger } from '@ideia/logger'
import {
  LangGraphAgentRole, LangGraphNodeTiming, TraceContextCarrier,
  LatencyBudgetReport, GraphSLO, SLOStatus, ReplaySnapshot,
  LatencyHeatmapCell, LangFuseTraceParams,
} from './types'
const config = ConfigManager.getInstance();


const logger = createLogger('langgraph-observability')

export class LangGraphTracer {
  private _spans = new Map<string, { id: string; role: LangGraphAgentRole; startTime: number; attributes: Record<string, unknown>; events: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }> }>()
  private _traceId: string

  constructor() {
    this._traceId = randomUUID()
  }

  startNodeSpan(role: LangGraphAgentRole, attrs?: Record<string, unknown>): string {
    const id = `span-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    this._spans.set(id, { id, role, startTime: Date.now(), attributes: { 'langgraph.node.role': role, ...attrs }, events: [] })
    logger.debug('Span started', { id, role })
    return id
  }

  endNodeSpan(spanId: string, result: { success: boolean; durationMs: number; error?: string }, llmMetrics?: { provider: string; model: string; promptTokens: number; completionTokens: number }): void {
    const span = this._spans.get(spanId)
    if (!span) return
    span.attributes['langgraph.node.duration_ms'] = result.durationMs
    span.attributes['langgraph.node.success'] = result.success
    if (result.error) span.attributes['langgraph.node.error'] = result.error
    if (llmMetrics) {
      span.attributes['langgraph.llm.provider'] = llmMetrics.provider
      span.attributes['langgraph.llm.model'] = llmMetrics.model
      span.attributes['langgraph.llm.prompt_tokens'] = llmMetrics.promptTokens
      span.attributes['langgraph.llm.completion_tokens'] = llmMetrics.completionTokens
      span.attributes['langgraph.llm.total_tokens'] = llmMetrics.promptTokens + llmMetrics.completionTokens
    }
    span.events.push({ name: 'span.end', timestamp: Date.now() })
  }

  addEvent(spanId: string, name: string, attrs?: Record<string, unknown>): void {
    const span = this._spans.get(spanId)
    if (span) span.events.push({ name, timestamp: Date.now(), attributes: attrs })
  }

  getSpan(spanId: string): { id: string; role: LangGraphAgentRole; attributes: Record<string, unknown>; events: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }> } | undefined {
    const s = this._spans.get(spanId)
    if (!s) return undefined
    return { id: s.id, role: s.role, attributes: { ...s.attributes }, events: [...s.events] }
  }

  getTraceSummary(): { spanCount: number; roles: string[]; totalDurationMs: number } {
    const spans = Array.from(this._spans.values())
    return {
      spanCount: spans.length,
      roles: [...new Set(spans.map(s => s.role))],
      totalDurationMs: spans.reduce((sum, s) => (sum + (s.attributes['langgraph.node.duration_ms'] as number) || 0), 0),
    }
  }

  clear(): void {
    this._spans.clear()
    this._traceId = randomUUID()
  }
}

export class LangFuseExporter {
  private _enabled: boolean
  private _fallbackLogs: LangFuseTraceParams[] = []

  constructor(enabled = false) {
    this._enabled = enabled
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled
  }

  async exportTrace(params: LangFuseTraceParams): Promise<void> {
    if (!this._enabled) {
      this._fallbackLogs.push(params)
      logger.debug('LangFuse fallback', { name: params.name })
      return
    }
    try {
      const mod = await new Promise<any>((resolve) => {
        try { resolve(require('langfuse')) } catch { resolve(null) }
      })
      if (!mod || !mod.Langfuse) {
        this._fallbackLogs.push(params)
        return
      }
      const client = new mod.Langfuse({
        secretKey: config.get('LANGFUSE_SECRET_KEY') || '',
        publicKey: config.get('LANGFUSE_PUBLIC_KEY') || '',
        baseUrl: config.get('LANGFUSE_HOST') || 'https://cloud.langfuse.com',
      })
      await client.trace({
        name: params.name,
        userId: params.userId,
        tags: params.tags ? Object.entries(params.tags).map(([k, v]) => `${k}:${v}`) : [],
        input: params.input,
        output: params.output,
        metadata: {
          provider: params.provider,
          model: params.model,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          costUsd: params.costUsd,
          latencyMs: params.latencyMs,
        },
      })
    } catch (err) {
      this._fallbackLogs.push(params)
      logger.warn('LangFuse export failed, falling back to local log', { error: (err as Error).message })
    }
  }

  getFallbackLogs(): LangFuseTraceParams[] {
    return [...this._fallbackLogs]
  }

  clearFallbackLogs(): void {
    this._fallbackLogs = []
  }
}

export class LangSmithExporter {
  private _enabled: boolean
  private _runs: Array<{ name: string; inputs: Record<string, unknown>; outputs: Record<string, unknown>; metadata: Record<string, unknown> }> = []

  constructor(enabled = false) {
    this._enabled = enabled
  }

  async exportRun(name: string, inputs: Record<string, unknown>, outputs: Record<string, unknown>, extra: Record<string, unknown>): Promise<void> {
    if (!this._enabled) {
      this._runs.push({ name, inputs, outputs, metadata: extra })
      return
    }
    try {
      const mod = await new Promise<any>((resolve) => {
        try { resolve(require('langsmith')) } catch { resolve(null) }
      })
      if (!mod || !mod.Client) {
        this._runs.push({ name, inputs, outputs, metadata: extra })
        return
      }
      const client = new mod.Client({ apiKey: config.get('LANGSMITH_API_KEY') || '' })
      await client.createRun({ name, inputs, outputs, runType: 'chain', ...extra })
    } catch (err) {
      this._runs.push({ name, inputs, outputs, metadata: extra })
      logger.warn('LangSmith export failed', { error: (err as Error).message })
    }
  }

  getPendingRuns(): Array<{ name: string; inputs: Record<string, unknown>; outputs: Record<string, unknown>; metadata: Record<string, unknown> }> {
    return [...this._runs]
  }
}

export class SLOMonitor {
  private _latencies: number[] = []
  private _maxHistory = 10000

  recordLatency(ms: number): void {
    this._latencies.push(ms)
    if (this._latencies.length > this._maxHistory) this._latencies.shift()
  }

  evaluate(targetMs: number, complianceTarget: number): { compliance: number; violations: number; total: number; p50: number; p95: number; p99: number } {
    const total = this._latencies.length
    const violations = this._latencies.filter(l => l > targetMs).length
    const sorted = [...this._latencies].sort((a, b) => a - b)
    return {
      compliance: total > 0 ? (total - violations) / total : 1,
      violations,
      total,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
    }
  }

  getComplianceTrend(windowSizes: number[]): Array<{ window: number; compliance: number }> {
    return windowSizes.map(window => {
      const slice = this._latencies.slice(-window)
      const violations = slice.filter(l => l > 1000).length
      return { window, compliance: slice.length > 0 ? (slice.length - violations) / slice.length : 1 }
    })
  }

  clear(): void {
    this._latencies = []
  }
}

export class ReplayDebugger {
  private _recordedExecutions = new Map<string, ReplaySnapshot[]>()

  recordSnapshot(executionId: string, snapshot: ReplaySnapshot): void {
    if (!this._recordedExecutions.has(executionId)) {
      this._recordedExecutions.set(executionId, [])
    }
    this._recordedExecutions.get(executionId)!.push({ ...snapshot, timestamp: Date.now() })
  }

  getSnapshots(executionId: string): ReplaySnapshot[] {
    return [...(this._recordedExecutions.get(executionId) || [])]
  }

  replay(executionId: string): ReplaySnapshot[] {
    const snapshots = this._recordedExecutions.get(executionId)
    if (!snapshots || snapshots.length === 0) throw new Error(`Execution ${executionId} not found`)
    return snapshots.map(s => ({ ...s }))
  }

  verifyFidelity(executionId: string, replaySnapshots: ReplaySnapshot[]): { isFidel: boolean; deviations: Array<{ step: number; expected: string; actual: string }> } {
    const original = this._recordedExecutions.get(executionId)
    if (!original) return { isFidel: false, deviations: [{ step: 0, expected: 'snapshots', actual: 'none' }] }
    const deviations: Array<{ step: number; expected: string; actual: string }> = []
    for (let i = 0; i < Math.max(original.length, replaySnapshots.length); i++) {
      const orig = original[i]
      const replay = replaySnapshots[i]
      if (!orig) { deviations.push({ step: i, expected: 'snapshot', actual: 'missing' }); continue }
      if (!replay) { deviations.push({ step: i, expected: orig.decision, actual: 'missing' }); continue }
      if (orig.decision !== replay.decision) {
        deviations.push({ step: i, expected: orig.decision, actual: replay.decision })
      }
    }
    return { isFidel: deviations.length === 0, deviations }
  }

  listExecutions(): string[] {
    return Array.from(this._recordedExecutions.keys())
  }

  clearExecution(executionId: string): void {
    this._recordedExecutions.delete(executionId)
  }
}

export class LatencyHeatmap {
  build(roleLatencies: Map<LangGraphAgentRole, number[]>, timeRangeMs: number): LatencyHeatmapCell[] {
    const cells: LatencyHeatmapCell[] = []
    const bucketSizeMs = 60000
    const bucketCount = Math.ceil(timeRangeMs / bucketSizeMs)
    const roles: LangGraphAgentRole[] = ['analyst', 'architect', 'programmer', 'reviewer', 'tester', 'devops', 'supervisor']

    for (const role of roles) {
      const latencies = roleLatencies.get(role) || []
      for (let b = 0; b < bucketCount; b++) {
        const bucketStart = Date.now() - timeRangeMs + b * bucketSizeMs
        const sorted = [...latencies].sort((a, b) => a - b)
        cells.push({
          role,
          timeBucket: new Date(bucketStart).toISOString().slice(0, 16),
          p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
          p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
          p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
          count: latencies.length,
        })
      }
    }
    return cells
  }

  toHTML(cells: LatencyHeatmapCell[]): string {
    const roles = [...new Set(cells.map(c => c.role))]
    const buckets = [...new Set(cells.map(c => c.timeBucket))].sort()
    let html = '<table><tr><th>Node / Time</th>'
    for (const bucket of buckets) html += `<th>${bucket.slice(11)}</th>`
    html += '</tr>'
    for (const role of roles) {
      html += `<tr><td>${role}</td>`
      for (const bucket of buckets) {
        const cell = cells.find(c => c.role === role && c.timeBucket === bucket)
        const p95 = cell?.p95 ?? 0
        const color = p95 > 10000 ? 'ff4444' : p95 > 1000 ? 'ffaa00' : '44ff44'
        html += `<td style="background:#${color}40">${p95}ms</td>`
      }
      html += '</tr>'
    }
    html += '</table>'
    return html
  }
}

export class TracePropagator {
  inject(carrier: Record<string, string>): void {
    const traceId = randomUUID().replace(/-/g, '').substring(0, 32)
    const spanId = randomUUID().replace(/-/g, '').substring(0, 16)
    carrier['traceparent'] = `00-${traceId}-${spanId}-01`
  }

  extract(carrier: Record<string, string>): { traceId?: string; spanId?: string } {
    if (!carrier['traceparent']) return {}
    const parts = carrier['traceparent'].split('-')
    return { traceId: parts[1], spanId: parts[2] }
  }

  propagateToState(state: Record<string, unknown>): Record<string, unknown> {
    const carrier: Record<string, string> = {}
    this.inject(carrier)
    return { ...state, __traceparent: carrier['traceparent'] }
  }

  extractFromState(state: Record<string, unknown>): { traceId?: string; spanId?: string } {
    const traceparent = state['__traceparent'] as string | undefined
    if (!traceparent) return {}
    return this.extract({ traceparent })
  }
}

export class LatencyBudgetTracker {
  private _budgets = new Map<string, { allocatedMs: number; consumedMs: number; deadline: number; isCritical: boolean; remainingMs: number }>()
  private _totalBudget: number
  private _startTime: number

  constructor(totalBudgetMs: number) {
    this._totalBudget = totalBudgetMs
    this._startTime = Date.now()
  }

  allocateBudgets(nodes: Array<{ role: string; weight: number }>): void {
    const weightsSum = nodes.reduce((s, n) => s + n.weight, 0)
    let currentDeadline = Date.now()
    for (const node of nodes.sort((a, b) => b.weight - a.weight)) {
      const allocated = Math.floor((node.weight / weightsSum) * this._totalBudget)
      this._budgets.set(node.role, { allocatedMs: allocated, consumedMs: 0, deadline: currentDeadline + allocated, isCritical: false, remainingMs: allocated })
      currentDeadline += allocated
    }
  }

  startNode(role: string): boolean {
    const budget = this._budgets.get(role)
    if (!budget) return false
    if (Date.now() > budget.deadline) { budget.isCritical = true; return false }
    return true
  }

  completeNode(role: string, consumedMs: number): LatencyBudgetReport {
    const budget = this._budgets.get(role)
    if (!budget) return { role, overBudget: false, remainingMs: 0, deadlineMissed: false }
    budget.consumedMs = consumedMs
    budget.remainingMs = budget.allocatedMs - consumedMs
    const deadlineMissed = Date.now() > budget.deadline
    if (budget.remainingMs < 0) {
      budget.isCritical = true
      this._propagateDeadline(role, Math.abs(budget.remainingMs))
    }
    return { role, overBudget: budget.remainingMs < 0, remainingMs: budget.remainingMs, deadlineMissed }
  }

  private _propagateDeadline(fromRole: string, overrunMs: number): void {
    const entries = Array.from(this._budgets.entries())
    const idx = entries.findIndex(([k]) => k === fromRole)
    if (idx < 0 || idx >= entries.length - 1) return
    const remaining = entries.slice(idx + 1)
    const remainingBudget = remaining.reduce((s, [, v]) => s + v.remainingMs, 0)
    if (remainingBudget <= 0) return
    for (const [, budget] of remaining) {
      const reduction = Math.floor((budget.remainingMs / remainingBudget) * overrunMs)
      budget.allocatedMs -= reduction
      budget.deadline -= reduction
      budget.remainingMs = budget.allocatedMs - budget.consumedMs
      if (budget.remainingMs < 0) budget.isCritical = true
    }
  }

  getRemainingBudget(): number {
    return Array.from(this._budgets.values()).reduce((s, b) => s + b.remainingMs, 0)
  }

  getCriticalNodes(): string[] {
    return Array.from(this._budgets.entries()).filter(([, b]) => b.isCritical).map(([k]) => k)
  }

  getDeadlinePressure(): number {
    const now = Date.now()
    const totalAllocated = Array.from(this._budgets.values()).reduce((s, b) => s + b.allocatedMs, 0)
    const totalRemaining = Array.from(this._budgets.values()).reduce((s, b) => s + Math.max(0, b.deadline - now), 0)
    return totalAllocated > 0 ? 1 - totalRemaining / totalAllocated : 0
  }
}

export class GraphSloMonitor {
  private _slos: GraphSLO[] = []
  private _executions: Array<{ durationMs: number; timestamp: number; success: boolean }> = []
  private _maxHistory = 10000

  registerSLO(slo: GraphSLO): void {
    this._slos.push(slo)
  }

  recordExecution(durationMs: number, success: boolean): void {
    this._executions.push({ durationMs, timestamp: Date.now(), success })
    if (this._executions.length > this._maxHistory) this._executions.shift()
  }

  evaluateAll(): SLOStatus[] {
    return this._slos.map(slo => this._evaluate(slo))
  }

  evaluateByName(name: string): SLOStatus | undefined {
    const slo = this._slos.find(s => s.name === name)
    return slo ? this._evaluate(slo) : undefined
  }

  private _evaluate(slo: GraphSLO): SLOStatus {
    const now = Date.now()
    const windowed = this._executions.filter(e => e.timestamp > now - slo.windowMs)
    const violations = windowed.filter(e => e.durationMs > slo.targetLatencyMs)
    const compliance = windowed.length > 0 ? (windowed.length - violations.length) / windowed.length : 1
    const burnRate = windowed.length > 0 ? violations.length / windowed.length : 0
    const remainingBudget = slo.errorBudget - violations.length
    const windowMinutes = slo.windowMs / 60000
    const timeToBurnMs = burnRate > 0 ? (remainingBudget / (burnRate * (windowed.length / windowMinutes))) * 60000 : Infinity
    let alertLevel: 'none' | 'warning' | 'critical' = 'none'
    if (compliance < slo.complianceTarget) {
      alertLevel = remainingBudget < slo.errorBudget * 0.1 ? 'critical' : 'warning'
    }
    return {
      name: slo.name,
      compliance,
      violations: violations.length,
      totalExecutions: windowed.length,
      burnRate,
      remainingBudget,
      timeToBurnMs: Math.round(timeToBurnMs),
      alertLevel,
    }
  }

  getSloReport(): string {
    return this.evaluateAll().map(s =>
      `SLO: ${s.name} | Compliance: ${(s.compliance * 100).toFixed(1)}% | Violations: ${s.violations}/${s.totalExecutions} | Burn: ${(s.burnRate * 100).toFixed(1)}% | Budget: ${s.remainingBudget} | Alert: ${s.alertLevel}`
    ).join('\n')
  }

  clear(): void {
    this._executions = []
  }
}
