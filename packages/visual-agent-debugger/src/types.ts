export interface AgentTrace {
  id: string
  agentId: string
  step: string
  input: string
  output: string
  timestamp: string
  durationMs: number
  status: 'ok' | 'error' | 'timeout'
  metadata?: Record<string, unknown>
}

export interface TraceSpan {
  id: string
  traceId: string
  parentId: string | null
  name: string
  startTime: string
  endTime: string
  durationMs: number
  tags: Record<string, string>
}

export interface AgentStateSnapshot {
  agentId: string
  timestamp: string
  variables: Record<string, unknown>
  memory: Record<string, unknown>
  stack: string[]
  toolCalls?: Array<{ tool: string; args: Record<string, unknown>; result: string }>
}

export interface ReplayStep {
  trace: AgentTrace
  stateBefore: AgentStateSnapshot
  stateAfter: AgentStateSnapshot
  diff?: Record<string, { from: unknown; to: unknown }>
}

export interface DebugSession {
  id: string
  agentId: string
  traces: AgentTrace[]
  spans: TraceSpan[]
  startTime: string
  endTime: string
  summary?: string
  errorCount: number
  totalDurationMs: number
}

export interface FlamegraphNode {
  name: string
  value: number
  children: FlamegraphNode[]
  status?: 'ok' | 'error' | 'timeout'
}

export interface DebuggerQuery {
  agentId?: string
  status?: 'ok' | 'error' | 'timeout'
  step?: string
  since?: string
  until?: string
  minDuration?: number
  maxDuration?: number
  limit?: number
}

export interface DebuggerReport {
  sessionCount: number
  traceCount: number
  totalDurationMs: number
  avgDurationMs: number
  errorCount: number
  errorRate: number
  topSlowestSteps: Array<{ step: string; avgMs: number; count: number }>
  agentBreakdown: Array<{ agentId: string; traceCount: number; errorCount: number }>
}
