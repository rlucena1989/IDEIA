import { AgentDebugger } from '../debugger'

describe('AgentDebugger', () => {
  let debugger_: AgentDebugger
  beforeEach(() => { debugger_ = new AgentDebugger(); debugger_.clear() })

  it('should start and end sessions', () => {
    const id = debugger_.startSession('agent1')
    debugger_.endSession(id)
    const traces = debugger_.getTraces()
    expect(traces).toEqual([])
  })

  it('should add traces', () => {
    debugger_.addTrace({ id: 't1', agentId: 'agent1', step: 'analyze', input: 'x', output: 'y', timestamp: '', durationMs: 100, status: 'ok' })
    expect(debugger_.getTraces().length).toBe(1)
    expect(debugger_.getTraces({ agentId: 'agent1' }).length).toBe(1)
  })

  it('should filter traces by agent', () => {
    debugger_.addTrace({ id: 't1', agentId: 'a1', step: 's1', input: '', output: '', timestamp: '', durationMs: 10, status: 'ok' })
    debugger_.addTrace({ id: 't2', agentId: 'a2', step: 's1', input: '', output: '', timestamp: '', durationMs: 10, status: 'ok' })
    expect(debugger_.getTraces({ agentId: 'a1' }).length).toBe(1)
  })

  it('should generate flamegraph', () => {
    const sid = debugger_.startSession('agent1')
    debugger_.addTrace({ id: 't1', agentId: 'agent1', step: 'think', input: '', output: '', timestamp: '', durationMs: 200, status: 'ok' })
    debugger_.addTrace({ id: 't2', agentId: 'agent1', step: 'act', input: '', output: '', timestamp: '', durationMs: 100, status: 'ok' })
    const fg = debugger_.generateFlamegraph(sid)
    expect(fg.name).toBe('agent1')
    expect(fg.children.length).toBe(2)
    expect(fg.children[0].value).toBe(200)
  })

  it('should build replay', () => {
    const sid = debugger_.startSession('agent1')
    debugger_.addTrace({ id: 't1', agentId: 'agent1', step: 'step1', input: 'in', output: 'out', timestamp: '', durationMs: 50, status: 'ok' })
    const replay = debugger_.buildReplay(sid)
    expect(replay.length).toBe(1)
    expect(replay[0].trace.input).toBe('in')
  })

  it('should generate report', () => {
    const sid = debugger_.startSession('agent1')
    debugger_.addTrace({ id: 't1', agentId: 'agent1', step: 'think', input: '', output: '', timestamp: '', durationMs: 200, status: 'ok' })
    debugger_.addTrace({ id: 't2', agentId: 'agent1', step: 'act', input: '', output: '', timestamp: '', durationMs: 100, status: 'error' })
    debugger_.endSession(sid)
    const report = debugger_.generateReport('agent1')
    expect(report.traceCount).toBe(2)
    expect(report.errorCount).toBe(1)
    expect(report.topSlowestSteps.length).toBeGreaterThan(0)
  })

  it('should list sessions', () => {
    debugger_.startSession('agent1')
    debugger_.startSession('agent2')
    expect(debugger_.listSessions().length).toBe(2)
    expect(debugger_.listSessions('agent1').length).toBe(1)
  })

  it('should delete session', () => {
    const id = debugger_.startSession('agent1')
    expect(debugger_.getSession(id)).not.toBeNull()
    debugger_.deleteSession(id)
    expect(debugger_.getSession(id)).toBeNull()
  })
})
