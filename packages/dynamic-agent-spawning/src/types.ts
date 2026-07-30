export type PoolType = 'warm' | 'cold' | 'elastic' | 'dedicated'
export type AgentStatus = 'spawning' | 'warm' | 'active' | 'idle' | 'hibernating' | 'killed'
export type ScalingStrategy = 'reactive' | 'predictive' | 'event-triggered'

export interface AgentInstance {
  id: string
  role: string
  status: AgentStatus
  poolType: PoolType
  createdAt: string
  lastActiveAt: string
  memoryUsage: number
  taskCount: number
}

export interface ScalingDecision {
  strategy: ScalingStrategy
  action: 'scale_up' | 'scale_down' | 'noop'
  count: number
  reason: string
  cooldownUntil: string
}

export interface PoolConfig {
  warmPoolSize: number
  coldPoolSize: number
  maxElastic: number
  idleTimeoutMs: number
  cooldownMs: number
  scaleUpThreshold: number
  scaleDownThreshold: number
}

export interface PoolMetrics {
  warmCount: number
  coldCount: number
  elasticCount: number
  dedicatedCount: number
  activeCount: number
  idleCount: number
  totalMemory: number
  queueDepth: number
}
