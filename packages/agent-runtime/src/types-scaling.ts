export type PoolType = 'warm' | 'cold' | 'elastic' | 'dedicated'

export type AgentLifecycleState = 'spawning' | 'warm' | 'active' | 'idle' | 'hibernate' | 'error' | 'kill'

export type ScalingStrategy = 'reactive' | 'predictive' | 'event-triggered'

export interface PoolSizingRule {
  poolType: PoolType
  minSize: number
  maxSize: number
  targetUtilization: number
  ttlMs: number
  preWarmTimeoutMs: number
  scalingFactor: number
}

export const DEFAULT_POOL_RULES: PoolSizingRule[] = [
  { poolType: 'warm', minSize: 2, maxSize: 20, targetUtilization: 0.7, ttlMs: 300000, preWarmTimeoutMs: 5000, scalingFactor: 1.5 },
  { poolType: 'cold', minSize: 5, maxSize: 50, targetUtilization: 0.8, ttlMs: 600000, preWarmTimeoutMs: 30000, scalingFactor: 2.0 },
  { poolType: 'elastic', minSize: 0, maxSize: 100, targetUtilization: 0.9, ttlMs: 0, preWarmTimeoutMs: 60000, scalingFactor: 3.0 },
  { poolType: 'dedicated', minSize: 1, maxSize: 5, targetUtilization: 0.5, ttlMs: 0, preWarmTimeoutMs: 0, scalingFactor: 1.0 },
]

export interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'hold'
  count: number
  reason: string
  strategy: ScalingStrategy
}

export interface PoolStats {
  poolType: PoolType
  activeCount: number
  idleCount: number
  warmCount: number
  totalSlots: number
  maxSlots: number
  utilization: number
}

export interface ReactiveMetrics {
  cpuPercent: number
  queueDepth: number
  memoryPercent: number
  activeTasks: number
  idleCount: number
}

export interface SpawnedAgent {
  id: string
  poolType: PoolType
  state: AgentLifecycleState
  createdAt: number
  lastActivity: number
  metadata: Record<string, string>
}

export interface ScheduledEvent {
  id: string
  cron: string
  action: 'scale_up' | 'scale_down'
  count: number
  poolType?: PoolType
  lastTriggered?: number
}

export interface PoolHealth {
  poolType: PoolType
  totalAgents: number
  availableAgents: number
  utilizationPercent: number
  avgLatencyMs: number
  healthy: boolean
}
