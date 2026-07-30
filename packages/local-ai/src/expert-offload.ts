import { createLogger } from '@ideia/logger'
import type { MoEModelInfo } from './moe-router'

const log = createLogger('local-ai:moe:offload')

export interface ExpertSlot {
  expertId: number
  modelId: string
  lastAccessed: number
  accessCount: number
  sizeMb: number
  location: 'vram' | 'ram'
}

export interface ExpertOffloadConfig {
  maxVramSlots: number
  swapThreshold: number
  prefetchEnabled: boolean
  location: 'vram' | 'ram' | 'auto'
}

export interface OffloadMetrics {
  expertUtilization: number
  swapRate: number
  activeSlots: number
  totalSlots: number
  hits: number
  misses: number
  hitRate: number
}

export const DEFAULT_OFFLOAD_CONFIG: ExpertOffloadConfig = {
  maxVramSlots: 8,
  swapThreshold: 0.8,
  prefetchEnabled: true,
  location: 'auto',
}

export class ExpertOffloadManager {
  private vramSlots: Map<number, ExpertSlot> = new Map()
  private swapHistory: Array<{ expertId: number; from: string; to: string; timestamp: number }> = []
  private hits = 0
  private misses = 0
  private config: ExpertOffloadConfig

  constructor(config?: Partial<ExpertOffloadConfig>) {
    this.config = { ...DEFAULT_OFFLOAD_CONFIG, ...config }
  }

  getConfig(): ExpertOffloadConfig {
    return { ...this.config }
  }

  updateConfig(update: Partial<ExpertOffloadConfig>): void {
    this.config = { ...this.config, ...update }
    log.info('ExpertOffloadManager config updated', { config: this.config })
  }

  async loadExpert(expertId: number, model: MoEModelInfo): Promise<void> {
    if (this.vramSlots.has(expertId)) {
      const slot = this.vramSlots.get(expertId) as ExpertSlot
      slot.lastAccessed = Date.now()
      slot.accessCount++
      this.hits++
      return
    }

    this.misses++

    if (this.vramSlots.size >= this.config.maxVramSlots) {
      await this.swapOutLRU()
    }

    const slot: ExpertSlot = {
      expertId,
      modelId: model.id,
      lastAccessed: Date.now(),
      accessCount: 1,
      sizeMb: Math.round((model.totalParams * 1024) / model.numExperts),
      location: 'vram',
    }

    this.vramSlots.set(expertId, slot)
    log.info('Expert loaded to VRAM', { expertId, model: model.id, slotSize: `${slot.sizeMb}MB` })
  }

  async unloadExpert(expertId: number): Promise<void> {
    const slot = this.vramSlots.get(expertId)
    if (slot) {
      this.swapHistory.push({
        expertId,
        from: 'vram',
        to: 'ram',
        timestamp: Date.now(),
      })
      this.vramSlots.delete(expertId)
      log.info('Expert unloaded from VRAM', { expertId })
    }
  }

  getActiveExperts(): ExpertSlot[] {
    return Array.from(this.vramSlots.values())
      .filter(s => Date.now() - s.lastAccessed < 5000)
  }

  getMetrics(): OffloadMetrics {
    const totalSlots = this.config.maxVramSlots
    const activeSlots = this.vramSlots.size
    const activeNow = this.getActiveExperts().length
    const totalAccesses = this.hits + this.misses

    const recentSwaps = this.swapHistory.filter(
      s => Date.now() - s.timestamp < 60000
    ).length

    return {
      expertUtilization: activeSlots > 0 ? activeNow / activeSlots : 0,
      swapRate: recentSwaps / 60,
      activeSlots,
      totalSlots,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalAccesses > 0 ? this.hits / totalAccesses : 0,
    }
  }

  getVramSlots(): Map<number, ExpertSlot> {
    return new Map(this.vramSlots)
  }

  reset(): void {
    this.vramSlots.clear()
    this.swapHistory = []
    this.hits = 0
    this.misses = 0
    log.info('ExpertOffloadManager reset')
  }

  private async swapOutLRU(): Promise<void> {
    let lruId = -1
    let lruTime = Infinity

    for (const [id, slot] of this.vramSlots) {
      if (slot.lastAccessed < lruTime) {
        lruTime = slot.lastAccessed
        lruId = id
      }
    }

    if (lruId >= 0) {
      const slot = this.vramSlots.get(lruId) as ExpertSlot
      this.swapHistory.push({
        expertId: lruId,
        from: 'vram',
        to: 'ram' as const,
        timestamp: Date.now(),
      })
      this.vramSlots.delete(lruId)
      log.info('Swapped out LRU expert', {
        expertId: lruId,
        model: slot.modelId,
        accessCount: slot.accessCount,
      })
    }
  }
}

export class LoadBalancer {
  computeAuxiliaryLoss(expertCounts: number[], totalTokens: number, alpha: number = 0.01): number {
    if (totalTokens === 0) return 0
    const importance = expertCounts.map(c => c / totalTokens)
    const loss = importance.reduce((sum, p) => sum + p * p, 0) * expertCounts.length
    return alpha * loss
  }

  computeZLoss(gatingLogits: number[], beta: number = 0.001): number {
    if (gatingLogits.length === 0) return 0
    const maxLogit = gatingLogits.reduce((max, x) => Math.max(max, x), -Infinity)
    const sumExp = gatingLogits.reduce((sum, x) => sum + Math.exp(x - maxLogit), 0)
    const z = maxLogit + Math.log(sumExp)
    return beta * z * z
  }

  getLoadBalanceScore(expertCounts: number[]): number {
    if (expertCounts.length === 0) return 0
    const mean = expertCounts.reduce((a, b) => a + b, 0) / expertCounts.length
    if (mean === 0) return 0
    const variance = expertCounts.reduce((a, b) => a + (b - mean) ** 2, 0) / expertCounts.length
    return Math.sqrt(variance) / mean
  }

  isBalanced(expertCounts: number[], threshold: number = 0.3): boolean {
    return this.getLoadBalanceScore(expertCounts) <= threshold
  }
}

export function createExpertOffloadManager(config?: Partial<ExpertOffloadConfig>): ExpertOffloadManager {
  return new ExpertOffloadManager(config)
}

export function createLoadBalancer(): LoadBalancer {
  return new LoadBalancer()
}
