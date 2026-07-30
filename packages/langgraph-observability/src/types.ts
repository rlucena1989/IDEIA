export type LangGraphAgentRole = 'analyst' | 'architect' | 'programmer' | 'reviewer' | 'tester' | 'devops' | 'supervisor'

export interface LangGraphNodeTiming {
  role: LangGraphAgentRole
  durationMs: number
  attempts: number
  error?: string
  status: 'running' | 'completed' | 'failed'
}

export interface SpanAttribute {
  key: string
  value: unknown
}

export interface SpanEvent {
  name: string
  attributes?: Record<string, unknown>
  timestamp?: number
}

export interface TraceContextCarrier {
  traceparent?: string
  tracestate?: string
  baggage?: string
}

export interface LatencyBudgetReport {
  role: string
  overBudget: boolean
  remainingMs: number
  deadlineMissed: boolean
}

export interface GraphSLO {
  name: string
  targetLatencyMs: number
  complianceTarget: number
  errorBudget: number
  windowMs: number
}

export interface SLOStatus {
  name: string
  compliance: number
  violations: number
  totalExecutions: number
  burnRate: number
  remainingBudget: number
  timeToBurnMs: number
  alertLevel: 'none' | 'warning' | 'critical'
}

export interface ReplaySnapshot {
  node: LangGraphAgentRole
  timestamp: number
  state: Record<string, unknown>
  decision: string
  llmResponse: string
}

export interface LatencyHeatmapCell {
  role: LangGraphAgentRole
  timeBucket: string
  p50: number
  p95: number
  p99: number
  count: number
}

export interface LangFuseTraceParams {
  name: string
  provider: string
  model: string
  input: string
  output: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  latencyMs: number
  userId?: string
  tags?: Record<string, string>
}
