import { LangGraphTracer } from '../tracer'

describe('LangGraphTracer', () => {
  let tracer: LangGraphTracer
  beforeEach(() => { tracer = new LangGraphTracer() })

  it('should start and end execution', () => {
    const id = tracer.startExecution('graph1', [{ id: 'n1', name: 'agent1', type: 'agent', parentId: null }], [])
    tracer.endExecution(id, true)
    const report = tracer.generateReport('2026-07')
    expect(report.executions).toBe(1)
  })

  it('should add spans to execution', () => {
    const id = tracer.startExecution('graph1', [{ id: 'n1', name: 'agent1', type: 'agent', parentId: null }], [])
    tracer.addSpan({ id: 's1', nodeId: 'n1', traceId: id, startTime: '', endTime: '', status: 'ok', durationMs: 100 })
    tracer.endExecution(id, true)
    expect(tracer.getMetrics(id).nodeCount).toBe(1)
  })

  it('should calculate metrics', () => {
    const id = tracer.startExecution('graph1', [{ id: 'n1', name: 'agent1', type: 'agent', parentId: null }, { id: 'n2', name: 'agent2', type: 'agent', parentId: null }], [{ from: 'n1', to: 'n2', label: 'next' }])
    tracer.addSpan({ id: 's1', nodeId: 'n1', traceId: id, startTime: '', endTime: '', status: 'ok', durationMs: 200 })
    tracer.addSpan({ id: 's2', nodeId: 'n2', traceId: id, startTime: '', endTime: '', status: 'error', durationMs: 300 })
    tracer.endExecution(id, false)
    const metrics = tracer.getMetrics(id)
    expect(metrics.nodeCount).toBe(2)
    expect(metrics.errorRate).toBeGreaterThan(0)
    expect(metrics.avgNodeDuration).toBe(250)
  })

  it('should generate report with slowest nodes', () => {
    const id = tracer.startExecution('g1', [{ id: 'n1', name: 'slow-agent', type: 'agent', parentId: null }], [])
    tracer.addSpan({ id: 's1', nodeId: 'n1', traceId: id, startTime: '', endTime: '', status: 'ok', durationMs: 500 })
    tracer.endExecution(id, true)
    const report = tracer.generateReport('2026-07')
    expect(report.slowestNodes.length).toBeGreaterThan(0)
    expect(report.slowestNodes[0].name).toBe('slow-agent')
  })
})
