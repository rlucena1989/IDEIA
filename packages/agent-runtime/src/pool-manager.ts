import { createLogger } from '@ideia/logger'
import { PoolType, PoolSizingRule, PoolStats, PoolHealth, SpawnedAgent, DEFAULT_POOL_RULES } from './types-scaling'
import { AgentLifecycleController } from './agent-lifecycle-controller'

const log = createLogger('agent-runtime:pool-manager')

export class PoolManager {
  private pools: Map<PoolType, SpawnedAgent[]> = new Map()
  private rules: Map<PoolType, PoolSizingRule> = new Map()
  private lifecycle: AgentLifecycleController
  private acquireHistory: Map<PoolType, number[]> = new Map()

  constructor(rules: PoolSizingRule[] = DEFAULT_POOL_RULES) {
    this.lifecycle = new AgentLifecycleController()
    for (const poolType of ['warm', 'cold', 'elastic', 'dedicated'] as PoolType[]) {
      this.pools.set(poolType, [])
      this.acquireHistory.set(poolType, [])
    }
    for (const rule of rules) {
      this.rules.set(rule.poolType, rule)
    }
    this.preWarmDefaults()
  }

  selectPool(type: PoolType): SpawnedAgent | null {
    const pool = this.pools.get(type)
    if (!pool) return null

    const available = pool.find(a => a.state === 'warm' || a.state === 'idle')
    if (available) {
      const start = Date.now()
      this.lifecycle.transitionTo(available.id, 'active')
      available.lastActivity = Date.now()
      const latency = Date.now() - start
      this.recordAcquireLatency(type, latency)
      return available
    }

    if (this.canCreateAgent(type)) {
      return this.createAgentInPool(type)
    }

    return null
  }

  preWarm(agentType: PoolType, count: number): void {
    const rule = this.rules.get(agentType)
    if (!rule) return

    const pool = this.pools.get(agentType)
    if (!pool) return

    const currentCount = pool.length
    const toCreate = Math.min(count, rule.maxSize - currentCount)

    for (let i = 0; i < toCreate; i++) {
      const agent = this.lifecycle.spawn(agentType, { preWarmed: 'true' })
      this.lifecycle.transitionTo(agent.id, 'warm')
      pool.push(agent)
    }
    log.info(`pre-warmed ${toCreate} agents for ${agentType} pool`)
  }

  recycle(agentId: string): boolean {
    const agent = this.lifecycle.getAgent(agentId)
    if (!agent) return false

    const rule = this.rules.get(agent.poolType)
    const pool = this.pools.get(agent.poolType)
    if (!pool || !rule) return false

    const poolSize = pool.length
    if (poolSize > rule.maxSize) {
      this.kill(agentId)
      return false
    }

    if (agent.state === 'active') {
      this.lifecycle.transitionTo(agentId, 'idle')
    }

    if (agent.state === 'idle') {
      const ttlExpired = Date.now() - agent.lastActivity > rule.ttlMs && rule.ttlMs > 0
      if (ttlExpired && poolSize > rule.minSize) {
        this.lifecycle.transitionTo(agentId, 'hibernate')
      }
    }

    return true
  }

  kill(agentId: string): boolean {
    const agent = this.lifecycle.getAgent(agentId)
    if (!agent) return false

    this.lifecycle.transitionTo(agentId, 'kill')
    const pool = this.pools.get(agent.poolType)
    if (pool) {
      const idx = pool.findIndex(a => a.id === agentId)
      if (idx >= 0) {
        pool.splice(idx, 1)
      }
    }
    this.lifecycle.removeAgent(agentId)
    return true
  }

  getPoolStats(poolType: PoolType): PoolStats {
    const pool = this.pools.get(poolType)
    const rule = this.rules.get(poolType)
    const totalSlots = pool ? pool.length : 0
    const maxSlots = rule ? rule.maxSize : 0
    const activeCount = pool ? pool.filter(a => a.state === 'active').length : 0
    const idleCount = pool ? pool.filter(a => a.state === 'idle').length : 0
    const warmCount = pool ? pool.filter(a => a.state === 'warm').length : 0
    const utilization = maxSlots > 0 ? activeCount / maxSlots : 0

    return {
      poolType,
      activeCount,
      idleCount,
      warmCount,
      totalSlots,
      maxSlots,
      utilization,
    }
  }

  getAllPoolStats(): PoolStats[] {
    return (['warm', 'cold', 'elastic', 'dedicated'] as PoolType[]).map(pt => this.getPoolStats(pt))
  }

  getPoolHealth(poolType: PoolType): PoolHealth {
    const stats = this.getPoolStats(poolType)
    const history = this.acquireHistory.get(poolType) || []
    const avgLatencyMs = history.length > 0
      ? history.reduce((a, b) => a + b, 0) / history.length
      : 0
    const availableAgents = stats.idleCount + stats.warmCount
    const healthy = availableAgents > 0 || stats.utilization < 0.9

    return {
      poolType,
      totalAgents: stats.activeCount + stats.idleCount + stats.warmCount,
      availableAgents,
      utilizationPercent: stats.utilization * 100,
      avgLatencyMs,
      healthy,
    }
  }

  getAllPoolHealth(): PoolHealth[] {
    return (['warm', 'cold', 'elastic', 'dedicated'] as PoolType[]).map(pt => this.getPoolHealth(pt))
  }

  getLifecycleController(): AgentLifecycleController {
    return this.lifecycle
  }

  getRule(poolType: PoolType): PoolSizingRule | undefined {
    return this.rules.get(poolType)
  }

  private preWarmDefaults(): void {
    for (const [poolType, rule] of this.rules) {
      if (rule.minSize > 0) {
        this.preWarm(poolType, rule.minSize)
      }
    }
  }

  private canCreateAgent(poolType: PoolType): boolean {
    const rule = this.rules.get(poolType)
    const pool = this.pools.get(poolType)
    if (!rule || !pool) return false
    return pool.length < rule.maxSize
  }

  private createAgentInPool(poolType: PoolType): SpawnedAgent {
    const pool = this.pools.get(poolType)
    const rule = this.rules.get(poolType)
    if (!pool || !rule) throw new Error(`Pool or rule not found for type: ${poolType}`)
    const agent = this.lifecycle.spawn(poolType)
    const isWarmOrDedicated = poolType === 'warm' || poolType === 'dedicated'
    if (isWarmOrDedicated) {
      this.lifecycle.transitionTo(agent.id, 'warm')
    } else {
      this.lifecycle.transitionTo(agent.id, 'warm')
    }
    pool.push(agent)
    return agent
  }

  private recordAcquireLatency(poolType: PoolType, latencyMs: number): void {
    const history = this.acquireHistory.get(poolType)
    if (history) {
      history.push(latencyMs)
      if (history.length > 100) {
        history.splice(0, history.length - 100)
      }
    }
  }
}
