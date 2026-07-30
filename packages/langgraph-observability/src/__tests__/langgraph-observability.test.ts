import { LangGraphTracer, LangFuseExporter, LangSmithExporter, SLOMonitor, ReplayDebugger, LatencyHeatmap, TracePropagator, LatencyBudgetTracker, GraphSloMonitor } from '../langgraph-observability'
import { LangGraphAgentRole, ReplaySnapshot } from '../types'

describe('LangGraphTracer', () => {
  let tracer: LangGraphTracer

  beforeEach(() => { tracer = new LangGraphTracer() })

  it('starts a node span', () => {
    const id = tracer.startNodeSpan('analyst')
    const span = tracer.getSpan(id)
    expect(span).toBeDefined()
    expect(span!.attributes['langgraph.node.role']).toBe('analyst')
  })

  it('ends a node span with success', () => {
    const id = tracer.startNodeSpan('programmer')
    tracer.endNodeSpan(id, { success: true, durationMs: 100 })
    const span = tracer.getSpan(id)
    expect(span!.attributes['langgraph.node.success']).toBe(true)
  })

  it('ends a node span with failure', () => {
    const id = tracer.startNodeSpan('tester')
    tracer.endNodeSpan(id, { success: false, durationMs: 200, error: 'timeout' })
    const span = tracer.getSpan(id)
    expect(span!.attributes['langgraph.node.error']).toBe('timeout')
  })

  it('adds LLM metrics to span', () => {
    const id = tracer.startNodeSpan('analyst')
    tracer.endNodeSpan(id, { success: true, durationMs: 150 }, { provider: 'openai', model: 'gpt-4o', promptTokens: 100, completionTokens: 50 })
    const span = tracer.getSpan(id)
    expect(span!.attributes['langgraph.llm.total_tokens']).toBe(150)
  })

  it('adds events to span', () => {
    const id = tracer.startNodeSpan('reviewer')
    tracer.addEvent(id, 'llm.call.started', { provider: 'openai' })
    tracer.addEvent(id, 'llm.call.completed', { tokens: 500 })
    const span = tracer.getSpan(id)
    expect(span!.events).toHaveLength(2)
  })

  it('returns trace summary', () => {
    tracer.startNodeSpan('analyst')
    tracer.startNodeSpan('programmer')
    const summary = tracer.getTraceSummary()
    expect(summary.spanCount).toBe(2)
  })

  it('returns undefined for unknown span', () => {
    expect(tracer.getSpan('unknown')).toBeUndefined()
  })

  it('clears all spans', () => {
    tracer.startNodeSpan('analyst')
    tracer.clear()
    expect(tracer.getTraceSummary().spanCount).toBe(0)
  })
})

describe('LangFuseExporter', () => {
  let exporter: LangFuseExporter

  beforeEach(() => { exporter = new LangFuseExporter(false) })

  it('falls back to local logs when disabled', async () => {
    await exporter.exportTrace({ name: 'test', provider: 'openai', model: 'gpt-4o', input: 'hi', output: 'hello', inputTokens: 10, outputTokens: 20, costUsd: 0.001, latencyMs: 100 })
    expect(exporter.getFallbackLogs()).toHaveLength(1)
  })

  it('toggles enabled state', () => {
    exporter.setEnabled(true)
    expect(exporter).toBeDefined()
  })

  it('clears fallback logs', async () => {
    await exporter.exportTrace({ name: 'test', provider: 'openai', model: 'gpt-4o', input: 'hi', output: 'hello', inputTokens: 10, outputTokens: 20, costUsd: 0.001, latencyMs: 100 })
    exporter.clearFallbackLogs()
    expect(exporter.getFallbackLogs()).toHaveLength(0)
  })
})

describe('LangSmithExporter', () => {
  let exporter: LangSmithExporter

  beforeEach(() => { exporter = new LangSmithExporter(false) })

  it('stores pending runs when disabled', async () => {
    await exporter.exportRun('test', { input: 'hi' }, { output: 'hello' }, { key: 'val' })
    expect(exporter.getPendingRuns()).toHaveLength(1)
  })

  it('stores run metadata', async () => {
    await exporter.exportRun('test-chain', { x: 1 }, { y: 2 }, { version: '1.0' })
    const runs = exporter.getPendingRuns()
    expect(runs[0].name).toBe('test-chain')
  })
})

describe('SLOMonitor', () => {
  let monitor: SLOMonitor

  beforeEach(() => { monitor = new SLOMonitor() })

  it('records latencies and evaluates compliance', () => {
    for (let i = 0; i < 10; i++) monitor.recordLatency(500)
    for (let i = 0; i < 3; i++) monitor.recordLatency(2000)
    const result = monitor.evaluate(1000, 0.9)
    expect(result.compliance).toBeCloseTo(0.769, 1)
    expect(result.violations).toBe(3)
    expect(result.total).toBe(13)
  })

  it('returns compliance trends', () => {
    monitor.recordLatency(100)
    monitor.recordLatency(200)
    const trends = monitor.getComplianceTrend([1, 2])
    expect(trends).toHaveLength(2)
  })

  it('clears history', () => {
    monitor.recordLatency(500)
    monitor.clear()
    const result = monitor.evaluate(1000, 0.9)
    expect(result.total).toBe(0)
  })
})

describe('ReplayDebugger', () => {
  let debugger_: ReplayDebugger

  beforeEach(() => { debugger_ = new ReplayDebugger() })

  it('records and retrieves snapshots', () => {
    const snapshot: ReplaySnapshot = { node: 'analyst', timestamp: Date.now(), state: { input: 'test' }, decision: 'continue', llmResponse: 'ok' }
    debugger_.recordSnapshot('exec-1', snapshot)
    const snapshots = debugger_.getSnapshots('exec-1')
    expect(snapshots).toHaveLength(1)
  })

  it('replays an execution', () => {
    debugger_.recordSnapshot('exec-1', { node: 'analyst', timestamp: Date.now(), state: {}, decision: 'go', llmResponse: 'yes' })
    const replay = debugger_.replay('exec-1')
    expect(replay).toHaveLength(1)
  })

  it('throws for unknown execution', () => {
    expect(() => debugger_.replay('unknown')).toThrow()
  })

  it('verifies fidelity', () => {
    debugger_.recordSnapshot('exec-1', { node: 'analyst', timestamp: Date.now(), state: {}, decision: 'go', llmResponse: 'yes' })
    const replay = debugger_.replay('exec-1')
    const result = debugger_.verifyFidelity('exec-1', replay)
    expect(result.isFidel).toBe(true)
  })

  it('lists executions', () => {
    debugger_.recordSnapshot('exec-1', { node: 'analyst', timestamp: Date.now(), state: {}, decision: 'go', llmResponse: 'yes' })
    expect(debugger_.listExecutions()).toContain('exec-1')
  })

  it('clears execution', () => {
    debugger_.recordSnapshot('exec-1', { node: 'analyst', timestamp: Date.now(), state: {}, decision: 'go', llmResponse: 'yes' })
    debugger_.clearExecution('exec-1')
    expect(debugger_.listExecutions()).not.toContain('exec-1')
  })
})

describe('LatencyHeatmap', () => {
  let heatmap: LatencyHeatmap

  beforeEach(() => { heatmap = new LatencyHeatmap() })

  it('builds heatmap cells', () => {
    const roleLatencies = new Map<LangGraphAgentRole, number[]>()
    roleLatencies.set('analyst', [100, 200, 300])
    const cells = heatmap.build(roleLatencies, 3600000)
    expect(cells.length).toBeGreaterThan(0)
    expect(cells[0].role).toBe('analyst')
  })

  it('generates HTML table', () => {
    const cells = [{ role: 'analyst' as LangGraphAgentRole, timeBucket: '12:00', p50: 100, p95: 200, p99: 300, count: 5 }]
    const html = heatmap.toHTML(cells)
    expect(html).toContain('<table>')
    expect(html).toContain('analyst')
  })
})

describe('TracePropagator', () => {
  let propagator: TracePropagator

  beforeEach(() => { propagator = new TracePropagator() })

  it('injects trace context into carrier', () => {
    const carrier: Record<string, string> = {}
    propagator.inject(carrier)
    expect(carrier['traceparent']).toBeDefined()
    expect(carrier['traceparent']).toMatch(/^00-/)
  })

  it('extracts trace context from carrier', () => {
    const carrier = { traceparent: '00-abcdef0123456789abcdef0123456789-abcdef0123456789-01' }
    const ctx = propagator.extract(carrier)
    expect(ctx.traceId).toBe('abcdef0123456789abcdef0123456789')
    expect(ctx.spanId).toBe('abcdef0123456789')
  })

  it('propagates to state', () => {
    const state = propagator.propagateToState({ key: 'val' })
    expect(state.__traceparent).toBeDefined()
  })

  it('extracts from state', () => {
    const state = { __traceparent: '00-abcdef0123456789abcdef0123456789-abcdef0123456789-01' }
    const ctx = propagator.extractFromState(state)
    expect(ctx.traceId).toBeDefined()
  })
})

describe('LatencyBudgetTracker', () => {
  let tracker: LatencyBudgetTracker

  beforeEach(() => { tracker = new LatencyBudgetTracker(10000) })

  it('allocates budgets proportionally', () => {
    tracker.allocateBudgets([{ role: 'analyst', weight: 3 }, { role: 'programmer', weight: 2 }])
    expect(tracker.getRemainingBudget()).toBe(10000)
  })

  it('checks if node can start within budget', () => {
    tracker.allocateBudgets([{ role: 'analyst', weight: 1 }])
    expect(tracker.startNode('analyst')).toBe(true)
  })

  it('reports overbudget', () => {
    tracker.allocateBudgets([{ role: 'analyst', weight: 1 }])
    const report = tracker.completeNode('analyst', 50000)
    expect(report.overBudget).toBe(true)
  })

  it('identifies critical nodes', () => {
    tracker.allocateBudgets([{ role: 'analyst', weight: 1 }])
    tracker.completeNode('analyst', 50000)
    const critical = tracker.getCriticalNodes()
    expect(critical).toContain('analyst')
  })
})

describe('GraphSloMonitor', () => {
  let monitor: GraphSloMonitor

  beforeEach(() => {
    monitor = new GraphSloMonitor()
    monitor.registerSLO({ name: 'latency', targetLatencyMs: 1000, complianceTarget: 0.95, errorBudget: 10, windowMs: 60000 })
  })

  it('registers SLOs and evaluates them', () => {
    for (let i = 0; i < 10; i++) monitor.recordExecution(500, true)
    for (let i = 0; i < 2; i++) monitor.recordExecution(2000, true)
    const results = monitor.evaluateAll()
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('latency')
  })

  it('evaluates SLO by name', () => {
    monitor.recordExecution(500, true)
    const status = monitor.evaluateByName('latency')
    expect(status).toBeDefined()
    expect(status!.compliance).toBe(1)
  })

  it('returns SLO report string', () => {
    monitor.recordExecution(500, true)
    const report = monitor.getSloReport()
    expect(report).toContain('SLO:')
  })

  it('clears execution data', () => {
    monitor.recordExecution(500, true)
    monitor.clear()
    expect(monitor.evaluateAll()[0].totalExecutions).toBe(0)
  })
})
