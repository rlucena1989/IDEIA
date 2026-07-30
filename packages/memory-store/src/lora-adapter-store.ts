import { createHash } from 'crypto'
import { createLogger } from '@ideia/logger'

const log = createLogger('memory-store:lora-adapter')

export interface LoRAAdapter {
  id: string
  name: string
  baseModel: string
  method: 'lora' | 'qlora' | 'dora'
  rank: number
  alpha: number
  targetModules: string[]
  projectId: string
  version: number
  metrics: {
    perplexity?: number
    trainLoss?: number[]
    evalScore?: number
  }
  createdAt: string
  updatedAt: string
  tags: string[]
  checksum: string
  active: boolean
}

export interface AdapterDiff {
  adapterId: string
  oldVersion: number
  newVersion: number
  metricsDelta: { perplexity?: number; evalScore?: number }
  changedAt: string
}

export class LoRAAdapterStore {
  private adapters: Map<string, LoRAAdapter> = new Map()
  private diffs: AdapterDiff[] = []

  async save(adapter: Omit<LoRAAdapter, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'checksum'>): Promise<LoRAAdapter> {
    const existing = Array.from(this.adapters.values())
      .find(a => a.name === adapter.name && a.projectId === adapter.projectId)
    const version = existing ? existing.version + 1 : 1

    const content = JSON.stringify(adapter)
    const checksum = createHash('sha256').update(content).digest('hex').slice(0, 16)

    const newAdapter: LoRAAdapter = {
      ...adapter,
      id: `lora-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      version,
      checksum,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    }

    if (existing) {
      this.diffs.push({
        adapterId: existing.id,
        oldVersion: existing.version,
        newVersion: version,
        metricsDelta: {
          perplexity: adapter.metrics.perplexity ? (existing.metrics.perplexity || 0) - (adapter.metrics.perplexity || 0) : undefined,
          evalScore: adapter.metrics.evalScore ? (adapter.metrics.evalScore || 0) - (adapter.metrics.evalScore || 0) : undefined,
        },
        changedAt: new Date().toISOString(),
      })
    }

    this.adapters.set(newAdapter.id, newAdapter)
    log.info('LoRA adapter saved', { id: newAdapter.id, name: newAdapter.name, version })

    return newAdapter
  }

  async get(adapterId: string): Promise<LoRAAdapter | undefined> {
    return this.adapters.get(adapterId)
  }

  async findByProject(projectId: string, activeOnly: boolean = true): Promise<LoRAAdapter[]> {
    return Array.from(this.adapters.values())
      .filter(a => a.projectId === projectId && (!activeOnly || a.active))
      .sort((a, b) => b.version - a.version)
  }

  async findByBaseModel(baseModel: string): Promise<LoRAAdapter[]> {
    return Array.from(this.adapters.values())
      .filter(a => a.baseModel === baseModel && a.active)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  async deactivate(adapterId: string): Promise<void> {
    const adapter = this.adapters.get(adapterId)
    if (adapter) {
      adapter.active = false
      adapter.updatedAt = new Date().toISOString()
      log.info('LoRA adapter deactivated', { id: adapterId })
    }
  }

  async getDiffHistory(adapterId?: string): Promise<AdapterDiff[]> {
    if (adapterId) {
      return this.diffs.filter(d => d.adapterId === adapterId)
        .sort((a, b) => b.newVersion - a.newVersion)
    }
    return [...this.diffs].sort((a, b) => b.newVersion - a.newVersion)
  }

  async listAll(): Promise<LoRAAdapter[]> {
    return Array.from(this.adapters.values())
  }

  async getActiveForProject(projectId: string): Promise<LoRAAdapter | undefined> {
    return Array.from(this.adapters.values())
      .filter(a => a.projectId === projectId && a.active)
      .sort((a, b) => b.version - a.version)[0]
  }
}
