import { createLogger } from '@ideia/logger'
import { AgentLifecycleState, SpawnedAgent, PoolType } from './types-scaling'

const log = createLogger('agent-runtime:lifecycle-controller')

const VALID_TRANSITIONS: Record<AgentLifecycleState, AgentLifecycleState[]> = {
  spawning: ['warm', 'error'],
  warm: ['active', 'idle', 'error', 'kill'],
  active: ['idle', 'error', 'kill'],
  idle: ['warm', 'hibernate', 'error', 'kill'],
  hibernate: ['warm', 'error', 'kill'],
  error: ['kill'],
  kill: [],
}

const STATE_TIMEOUTS: Partial<Record<AgentLifecycleState, number>> = {
  spawning: 10000,
  warm: 300000,
  active: 3600000,
  idle: 600000,
  hibernate: 1800000,
}

const LATENCY_ESTIMATES: Record<PoolType, [number, number]> = {
  warm: [0, 5],
  cold: [100, 500],
  elastic: [500, 2000],
  dedicated: [0, 0],
}

export class AgentLifecycleController {
  private agents: Map<string, SpawnedAgent> = new Map()
  private timeoutTimers: Map<string, NodeJS.Timeout> = new Map()
  private errorRecoveryCount: Map<string, number> = new Map()
  private readonly maxErrorRecoveries = 3

  spawn(poolType: PoolType, metadata: Record<string, string> = {}): SpawnedAgent {
    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const agent: SpawnedAgent = {
      id,
      poolType,
      state: 'spawning',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      metadata,
    }
    this.agents.set(id, agent)
    this.enforceTimeout(id, 'spawning')
    log.info(`spawned agent ${id} in ${poolType} pool`)
    return agent
  }

  transitionTo(agentId: string, target: AgentLifecycleState): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) {
      log.warn(`agent ${agentId} not found for transition to ${target}`)
      return false
    }

    const validNext = VALID_TRANSITIONS[agent.state]
    if (!validNext.includes(target)) {
      log.warn(`invalid transition ${agent.state} -> ${target} for agent ${agentId}`)
      return false
    }

    this.clearTimeout(agentId)
    agent.state = target
    agent.lastActivity = Date.now()
    this.enforceTimeout(agentId, target)

    log.info(`agent ${agentId} transitioned ${agent.state} -> ${target}`)
    return true
  }

  getAgent(agentId: string): SpawnedAgent | undefined {
    return this.agents.get(agentId)
  }

  removeAgent(agentId: string): boolean {
    this.clearTimeout(agentId)
    this.errorRecoveryCount.delete(agentId)
    return this.agents.delete(agentId)
  }

  getAgentsByState(state: AgentLifecycleState): SpawnedAgent[] {
    return Array.from(this.agents.values()).filter(a => a.state === state)
  }

  getAgentsByPool(poolType: PoolType): SpawnedAgent[] {
    return Array.from(this.agents.values()).filter(a => a.poolType === poolType)
  }

  handleError(agentId: string): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false

    const currentCount = (this.errorRecoveryCount.get(agentId) || 0) + 1
    if (currentCount > this.maxErrorRecoveries) {
      this.errorRecoveryCount.set(agentId, currentCount)
      this.transitionTo(agentId, 'kill')
      return false
    }

    this.errorRecoveryCount.set(agentId, currentCount)
    this.transitionTo(agentId, 'error')
    this.transitionTo(agentId, 'kill')
    return true
  }

  getEstimatedLatencyMs(poolType: PoolType): [number, number] {
    return LATENCY_ESTIMATES[poolType]
  }

  getAgentCount(): number {
    return this.agents.size
  }

  getStateDistribution(): Record<AgentLifecycleState, number> {
    const dist: Record<string, number> = {}
    for (const state of ['spawning', 'warm', 'active', 'idle', 'hibernate', 'error', 'kill'] as AgentLifecycleState[]) {
      dist[state] = 0
    }
    for (const agent of this.agents.values()) {
      dist[agent.state]++
    }
    return dist as Record<AgentLifecycleState, number>
  }

  reset(): void {
    for (const timer of this.timeoutTimers.values()) {
      clearTimeout(timer)
    }
    this.timeoutTimers.clear()
    this.agents.clear()
    this.errorRecoveryCount.clear()
  }

  private enforceTimeout(agentId: string, state: AgentLifecycleState): void {
    const timeout = STATE_TIMEOUTS[state]
    if (!timeout) return

    const timer = setTimeout(() => {
      const agent = this.agents.get(agentId)
      if (agent && agent.state === state) {
        log.warn(`state timeout for agent ${agentId} in state ${state} after ${timeout}ms`)
        this.handleError(agentId)
      }
    }, timeout)

    if (timer && typeof timer === 'object' && 'unref' in timer) {
      timer.unref()
    }

    this.timeoutTimers.set(agentId, timer)
  }

  private clearTimeout(agentId: string): void {
    const timer = this.timeoutTimers.get(agentId)
    if (timer) {
      clearTimeout(timer)
      this.timeoutTimers.delete(agentId)
    }
  }
}
