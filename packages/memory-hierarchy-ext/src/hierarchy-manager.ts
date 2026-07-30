import { createLogger } from '@ideia/logger'
import { MemoryEntry, MemoryLevel, PromotionRule, RetentionPolicy, MemoryStats } from './types'

const logger = createLogger('hierarchy-manager')

const DEFAULT_POLICIES: RetentionPolicy[] = [
  { level: 'L1_working', maxEntries: 100, ttlDays: 1, evictionStrategy: 'lru' },
  { level: 'L2_project', maxEntries: 1000, ttlDays: 90, evictionStrategy: 'importance' },
  { level: 'L3_institutional', maxEntries: 10000, ttlDays: 365, evictionStrategy: 'lfu' },
  { level: 'L4_archive', maxEntries: 100000, ttlDays: 3650, evictionStrategy: 'fifo' },
  { level: 'L5_ephemeral', maxEntries: 50, ttlDays: 0, evictionStrategy: 'lru' },
]

export class HierarchyManager {
  private entries = new Map<string, MemoryEntry>()
  private policies: Map<MemoryLevel, RetentionPolicy>

  constructor(policies?: RetentionPolicy[]) {
    this.policies = new Map()
    const source = policies ?? DEFAULT_POLICIES
    for (const p of source) this.policies.set(p.level, p)
  }

  addEntry(entry: MemoryEntry): void {
    const policy = this.policies.get(entry.level)
    if (policy) {
      const levelEntries = this.getByLevel(entry.level)
      if (levelEntries.length >= policy.maxEntries) this.evict(entry.level)
    }
    this.entries.set(entry.id, entry)
    logger.info(`Entry added`, { id: entry.id, level: entry.level })
  }

  access(id: string): MemoryEntry | undefined {
    const entry = this.entries.get(id)
    if (entry) { entry.accessCount++; entry.lastAccessed = new Date().toISOString() }
    return entry
  }

  promote(id: string, toLevel: MemoryLevel): void {
    const entry = this.entries.get(id)
    if (entry) { entry.level = toLevel; logger.info(`Entry promoted`, { id, toLevel }) }
  }

  getByLevel(level: MemoryLevel): MemoryEntry[] {
    return [...this.entries.values()].filter(e => e.level === level)
  }

  getStats(): MemoryStats {
    const byLevel = {} as Record<MemoryLevel, number>
    for (const level of ['L1_working', 'L2_project', 'L3_institutional', 'L4_archive', 'L5_ephemeral'] as MemoryLevel[]) {
      byLevel[level] = this.getByLevel(level).length
    }
    const entries = [...this.entries.values()]
    return {
      entriesByLevel: byLevel,
      totalEntries: entries.length,
      avgImportance: entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.importance, 0) / entries.length * 10) / 10 : 0,
      oldestEntry: entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]?.createdAt ?? '',
      newestEntry: entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt ?? '',
    }
  }

  private evict(level: MemoryLevel): void {
    const policy = this.policies.get(level)
    if (!policy) return
    const levelEntries = this.getByLevel(level).sort((a, b) => {
      switch (policy.evictionStrategy) {
        case 'lru': return new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime()
        case 'lfu': return a.accessCount - b.accessCount
        case 'importance': return a.importance - b.importance
        case 'fifo': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
    })
    const toRemove = levelEntries.slice(0, Math.max(1, Math.floor(levelEntries.length * 0.2)))
    for (const entry of toRemove) this.entries.delete(entry.id)
    logger.info(`Evicted ${toRemove.length} entries from ${level}`)
  }
}
