import { createLogger } from '@ideia/logger'
import { PoolType, SpawnedAgent, PoolStats } from './types-scaling'
import { PoolManager } from './pool-manager'

const log = createLogger('agent-runtime:agent-spawning')

export class AgentSpawner {
  private poolManager: PoolManager

  constructor(poolManager?: PoolManager) {
    this.poolManager = poolManager || new PoolManager()
  }

  spawn(type: PoolType, metadata: Record<string, string> = {}): SpawnedAgent | null {
    const startTime = Date.now()
    const agent = this.poolManager.selectPool(type)
    if (!agent) {
      log.warn(`no agent available for ${type} pool`)
      return null
    }

    const latencyMs = Date.now() - startTime
    const [minLatency, maxLatency] = this.getLatencyRange(type)
    if (latencyMs > maxLatency * 2) {
      log.warn(`high spawn latency for ${type}: ${latencyMs}ms (expected ${minLatency}-${maxLatency}ms)`)
    }

    return agent
  }

  recycle(agentId: string): boolean {
    return this.poolManager.recycle(agentId)
  }

  kill(agentId: string): boolean {
    return this.poolManager.kill(agentId)
  }

  getPoolStats(poolType: PoolType): PoolStats {
    return this.poolManager.getPoolStats(poolType)
  }

  getAllPoolStats(): PoolStats[] {
    return this.poolManager.getAllPoolStats()
  }

  getPoolManager(): PoolManager {
    return this.poolManager
  }

  private getLatencyRange(type: PoolType): [number, number] {
    const ranges: Record<PoolType, [number, number]> = {
      warm: [0, 5],
      cold: [100, 500],
      elastic: [500, 2000],
      dedicated: [0, 0],
    }
    return ranges[type]
  }
}
