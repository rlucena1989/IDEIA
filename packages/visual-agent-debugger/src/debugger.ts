import { createLogger } from '@ideia/logger'
import fs from 'node:fs'
import path from 'node:path'
import {
  AgentTrace, TraceSpan, AgentStateSnapshot, ReplayStep, DebugSession,
  FlamegraphNode, DebuggerQuery, DebuggerReport,
} from './types'

const logger = createLogger('agent-debugger')

function sessionsDir(): string {
  const dir = path.join(process.cwd(), '.ai', 'debug-sessions')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function sessionFile(id: string): string {
  return path.join(sessionsDir(), `${id}.json`)
}

function saveSession(session: DebugSession): void {
  try {
    fs.writeFileSync(sessionFile(session.id), JSON.stringify(session, null, 2), 'utf-8')
  } catch (err) {
    logger.error('Failed to save session', { sessionId: session.id, error: String(err) })
  }
}

function loadSession(id: string): DebugSession | null {
  try {
    const file = sessionFile(id)
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null
  } catch {
    return null
  }
}

export class AgentDebugger {
  private sessions = new Map<string, DebugSession>()
  private traces: AgentTrace[] = []

  constructor() {
    this.loadPersistedSessions()
  }

  private loadPersistedSessions(): void {
    try {
      const dir = sessionsDir()
      for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
        const session = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')) as DebugSession
        this.sessions.set(session.id, session)
        this.traces.push(...session.traces)
      }
    } catch { /* first run, no sessions yet */ }
  }

  startSession(agentId: string): string {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const session: DebugSession = {
      id, agentId, traces: [], spans: [],
      startTime: new Date().toISOString(), endTime: '',
      errorCount: 0, totalDurationMs: 0,
    }
    this.sessions.set(id, session)
    saveSession(session)
    logger.info(`Debug session started`, { id, agentId })
    return id
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    session.endTime = new Date().toISOString()
    session.totalDurationMs = session.traces.reduce((s, t) => s + t.durationMs, 0)
    session.errorCount = session.traces.filter(t => t.status === 'error').length
    session.summary = `${session.traces.length} traces, ${session.errorCount} errors, ${session.totalDurationMs}ms total`
    saveSession(session)
    logger.info(`Session ended`, { sessionId, summary: session.summary })
  }

  addTrace(trace: AgentTrace): void {
    this.traces.push(trace)
    for (const [, session] of this.sessions) {
      if (session.agentId === trace.agentId) {
        session.traces.push(trace)
        saveSession(session)
      }
    }
  }

  addSpan(span: TraceSpan): void {
    for (const [, session] of this.sessions) {
      session.spans.push(span)
      saveSession(session)
    }
  }

  getTraces(query?: DebuggerQuery): AgentTrace[] {
    let result = [...this.traces]
    if (query) {
      if (query.agentId) result = result.filter(t => t.agentId === query.agentId)
      if (query.status) result = result.filter(t => t.status === query.status)
      if (query.step) result = result.filter(t => t.step === query.step)
      if (query.since) result = result.filter(t => t.timestamp >= query.since!)
      if (query.until) result = result.filter(t => t.timestamp <= query.until!)
      if (query.minDuration) result = result.filter(t => t.durationMs >= query.minDuration!)
      if (query.maxDuration) result = result.filter(t => t.durationMs <= query.maxDuration!)
      if (query.limit) result = result.slice(0, query.limit)
    }
    return result
  }

  getSession(sessionId: string): DebugSession | null {
    return this.sessions.get(sessionId) ?? loadSession(sessionId)
  }

  listSessions(agentId?: string): DebugSession[] {
    const all = [...this.sessions.values()]
    return agentId ? all.filter(s => s.agentId === agentId) : all
  }

  deleteSession(sessionId: string): boolean {
    this.sessions.delete(sessionId)
    try {
      fs.unlinkSync(sessionFile(sessionId))
      return true
    } catch {
      return false
    }
  }

  generateFlamegraph(sessionId: string): FlamegraphNode {
    const session = this.getSession(sessionId)
    if (!session || session.traces.length === 0) {
      return { name: 'empty', value: 0, children: [] }
    }
    const root: FlamegraphNode = { name: session.agentId, value: 0, children: [] }
    const byStep = new Map<string, FlamegraphNode>()
    for (const trace of session.traces) {
      let node = byStep.get(trace.step)
      if (!node) {
        node = { name: trace.step, value: 0, children: [], status: trace.status }
        byStep.set(trace.step, node)
      }
      node.value += trace.durationMs
      if (trace.status === 'error') node.status = 'error'
    }
    root.children = [...byStep.values()].sort((a, b) => b.value - a.value)
    root.value = root.children.reduce((s, c) => s + c.value, 0)
    return root
  }

  buildReplay(sessionId: string): ReplayStep[] {
    const session = this.getSession(sessionId)
    if (!session) return []
    let lastState: AgentStateSnapshot | null = null
    return session.traces.map(t => {
      const state: AgentStateSnapshot = {
        agentId: t.agentId, timestamp: t.timestamp,
        variables: { lastStep: t.step, status: t.status },
        memory: { lastInput: t.input.slice(0, 100), lastOutput: t.output.slice(0, 100) },
        stack: [t.step],
      }
      const step: ReplayStep = {
        trace: t, stateBefore: lastState ?? state, stateAfter: state,
        diff: lastState ? computeDiff(lastState, state) : undefined,
      }
      lastState = state
      return step
    })
  }

  generateReport(agentId?: string): DebuggerReport {
    const traces = agentId ? this.traces.filter(t => t.agentId === agentId) : this.traces
    const sessions = agentId ? [...this.sessions.values()].filter(s => s.agentId === agentId) : [...this.sessions.values()]
    const totalDurationMs = traces.reduce((s, t) => s + t.durationMs, 0)
    const errorCount = traces.filter(t => t.status === 'error').length

    const stepStats = new Map<string, { totalMs: number; count: number }>()
    for (const t of traces) {
      const stat = stepStats.get(t.step) ?? { totalMs: 0, count: 0 }
      stat.totalMs += t.durationMs
      stat.count++
      stepStats.set(t.step, stat)
    }

    const agentMap = new Map<string, { traceCount: number; errorCount: number }>()
    for (const t of traces) {
      const stat = agentMap.get(t.agentId) ?? { traceCount: 0, errorCount: 0 }
      stat.traceCount++
      if (t.status === 'error') stat.errorCount++
      agentMap.set(t.agentId, stat)
    }

    return {
      sessionCount: sessions.length,
      traceCount: traces.length,
      totalDurationMs,
      avgDurationMs: traces.length > 0 ? totalDurationMs / traces.length : 0,
      errorCount,
      errorRate: traces.length > 0 ? errorCount / traces.length : 0,
      topSlowestSteps: [...stepStats.entries()]
        .map(([step, stat]) => ({ step, avgMs: stat.totalMs / stat.count, count: stat.count }))
        .sort((a, b) => b.avgMs - a.avgMs).slice(0, 10),
      agentBreakdown: [...agentMap.entries()]
        .map(([agentId, stat]) => ({ agentId, traceCount: stat.traceCount, errorCount: stat.errorCount })),
    }
  }

  clear(): void {
    this.sessions.clear()
    this.traces = []
    try {
      const dir = sessionsDir()
      for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
        fs.unlinkSync(path.join(dir, file))
      }
    } catch { /* */ }
    logger.info('All debug sessions cleared')
  }
}

function computeDiff(before: AgentStateSnapshot, after: AgentStateSnapshot): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {}
  const allKeys = new Set([...Object.keys(before.variables), ...Object.keys(after.variables)])
  for (const key of allKeys) {
    const fromVal = before.variables[key]
    const toVal = after.variables[key]
    if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      diff[key] = { from: fromVal, to: toVal }
    }
  }
  return diff
}
