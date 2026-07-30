import { createLogger } from '@ideia/logger'
import { AgentInstance, AgentStatus, PoolType, ScalingDecision, PoolConfig, PoolMetrics } from './types'

const logger = createLogger('pool-manager')

const DEFAULT_CONFIG: PoolConfig = {
  warmPoolSize: 3, coldPoolSize: 5, maxElastic: 20,
  idleTimeoutMs: 60000, cooldownMs: 30000,
  scaleUpThreshold: 0.7, scaleDownThreshold: 0.2,
}

export class PoolManager {
  private agents: Map<string, AgentInstance> = new Map()
  private config: PoolConfig
  private lastScaleTime = 0

  constructor(config?: Partial<PoolConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeWarmPool()
  }

  private initializeWarmPool(): void {
    for (let i = 0; i < this.config.warmPoolSize; i++) {
      this.spawnAgent(`warm-agent-${i}`, 'general', 'warm')
    }
  }

  spawnAgent(id: string, role: string, poolType: PoolType): AgentInstance {
    const agent: AgentInstance = {
      id, role, status: 'warm', poolType,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      memoryUsage: 50 + Math.random() * 200,
      taskCount: 0,
    }
    this.agents.set(id, agent)
    logger.info(`Agent spawned`, { id, role, poolType })
    return agent
  }

  acquireAgent(role: string): AgentInstance | null {
    const found = [...this.agents.values()].find(a => (a.status === 'warm' || a.status === 'idle') && a.role === role)
    if (found) {
      found.status = 'active'
      found.lastActiveAt = new Date().toISOString()
      found.taskCount++
      return found
    }
    if (this.countByPool('elastic') < this.config.maxElastic) {
      return this.spawnAgent(`elastic-${Date.now()}`, role, 'elastic')
    }
    return null
  }

  releaseAgent(id: string): void {
    const agent = this.agents.get(id)
    if (agent) {
      agent.status = 'idle'
      agent.lastActiveAt = new Date().toISOString()
    }
  }

  evaluateScaling(metrics: PoolMetrics): ScalingDecision {
    const now = Date.now()
    if (now - this.lastScaleTime < this.config.cooldownMs) {
      return { strategy: 'reactive', action: 'noop', count: 0, reason: 'Cooldown', cooldownUntil: new Date(now + 1000).toISOString() }
    }

    const utilization = metrics.activeCount / Math.max(metrics.warmCount + metrics.elasticCount, 1)
    if (utilization > this.config.scaleUpThreshold && this.countByPool('elastic') < this.config.maxElastic) {
      this.lastScaleTime = now
      return { strategy: 'reactive', action: 'scale_up', count: 2, reason: `Utilization ${Math.round(utilization * 100)}% > ${this.config.scaleUpThreshold * 100}%`, cooldownUntil: new Date(now + this.config.cooldownMs).toISOString() }
    }
    if (utilization < this.config.scaleDownThreshold && this.countByPool('elastic') > 0) {
      this.lastScaleTime = now
      return { strategy: 'reactive', action: 'scale_down', count: 1, reason: `Utilization ${Math.round(utilization * 100)}% < ${this.config.scaleDownThreshold * 100}%`, cooldownUntil: new Date(now + this.config.cooldownMs).toISOString() }
    }

    return { strategy: 'reactive', action: 'noop', count: 0, reason: 'Within thresholds', cooldownUntil: new Date(now + 1000).toISOString() }
  }

  cleanupIdleAgents(): number {
    const now = Date.now()
    let cleaned = 0
    for (const [id, agent] of this.agents) {
      if (agent.status === 'idle' && agent.poolType === 'elastic') {
        const idleMs = now - new Date(agent.lastActiveAt).getTime()
        if (idleMs >= this.config.idleTimeoutMs) {
          agent.status = 'killed'
          this.agents.delete(id)
          cleaned++
        }
      }
    }
    if (cleaned > 0) logger.info(`Idle agents cleaned`, { count: cleaned })
    return cleaned
  }

  getMetrics(): PoolMetrics {
    const agents = [...this.agents.values()]
    return {
      warmCount: agents.filter(a => a.poolType === 'warm').length,
      coldCount: agents.filter(a => a.poolType === 'cold').length,
      elasticCount: agents.filter(a => a.poolType === 'elastic').length,
      dedicatedCount: agents.filter(a => a.poolType === 'dedicated').length,
      activeCount: agents.filter(a => a.status === 'active').length,
      idleCount: agents.filter(a => a.status === 'idle').length,
      totalMemory: agents.reduce((s, a) => s + a.memoryUsage, 0),
      queueDepth: 0,
    }
  }

  private countByPool(type: PoolType): number {
    return [...this.agents.values()].filter(a => a.poolType === type).length
  }
}
