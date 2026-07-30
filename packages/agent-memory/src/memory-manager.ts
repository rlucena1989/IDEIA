import { createLogger } from '@ideia/logger'
import { MemoryEntry, MemoryLevel, EntryCategory, ConsolidationReport } from './types'

const logger = createLogger('agent-memory')

export class AgentMemoryManager {
  private _tiers = new Map<MemoryLevel, MemoryEntry[]>()
  private _consolidationCallbacks: Array<(report: ConsolidationReport) => void> = []

  constructor() {
    for (const level of ['l0_context', 'l1_cache', 'l2_cache', 'l3_working', 'l4_episodic', 'l5_semantic', 'l6_persistent'] as MemoryLevel[]) {
      this._tiers.set(level, [])
    }
  }

  store(entry: MemoryEntry): void {
    const entries = this._tiers.get(entry.level) || []
    const existing = entries.findIndex(e => e.id === entry.id)
    if (existing >= 0) entries[existing] = entry
    else entries.push(entry)
    this._tiers.set(entry.level, entries)
    logger.debug('Memory stored', { id: entry.id, level: entry.level, category: entry.category })
  }

  read(id: string): MemoryEntry | undefined {
    for (const [, entries] of this._tiers) {
      const found = entries.find(e => e.id === id)
      if (found) return { ...found }
    }
    return undefined
  }

  query(level?: MemoryLevel, category?: EntryCategory, tags?: string[]): MemoryEntry[] {
    let results: MemoryEntry[] = []
    for (const [lvl, entries] of this._tiers) {
      if (level && lvl !== level) continue
      results = results.concat(entries.filter(e => {
        if (category && e.category !== category) return false
        if (tags && tags.length > 0 && !tags.some(t => e.tags.includes(t))) return false
        return true
      }))
    }
    return results
  }

  update(id: string, updates: Partial<MemoryEntry>): boolean {
    for (const [, entries] of this._tiers) {
      const idx = entries.findIndex(e => e.id === id)
      if (idx >= 0) {
        entries[idx] = { ...entries[idx], ...updates, updatedAt: new Date().toISOString() }
        return true
      }
    }
    return false
  }

  remove(id: string): boolean {
    for (const [, entries] of this._tiers) {
      const idx = entries.findIndex(e => e.id === id)
      if (idx >= 0) { entries.splice(idx, 1); return true }
    }
    return false
  }

  consolidate(): ConsolidationReport {
    const report: ConsolidationReport = {
      timestamp: Date.now(),
      memoriesProcessed: 0,
      memoriesPromoted: 0,
      patternsExtracted: 0,
      promoted: [],
      patterns: [],
      replayed: 0,
      durationMs: 0,
      consolidated: 0,
      archived: 0,
      removed: 0,
      tiersBalanced: false,
    }
    for (const [level, entries] of this._tiers) {
      const stale = entries.filter(e => e.status === 'archived' || e.status === 'pending_review')
      report.removed = (report.removed ?? 0) + stale.length
      for (const s of stale) {
        const idx = entries.indexOf(s)
        if (idx >= 0) entries.splice(idx, 1)
      }
    }
    const l0 = this._tiers.get('l0_context')?.length || 0
    const l6 = this._tiers.get('l6_persistent')?.length || 0
    report.tiersBalanced = l0 <= l6 * 2
    this.notifyConsolidation(report)
    return report
  }

  getStats(): { totalEntries: number; byLevel: Record<string, number>; avgImportance: number } {
    const byLevel: Record<string, number> = {}
    let total = 0
    let importanceSum = 0
    for (const [level, entries] of this._tiers) {
      byLevel[level] = entries.length
      total += entries.length
      importanceSum += entries.reduce((s, e) => s + e.importance, 0)
    }
    return { totalEntries: total, byLevel, avgImportance: total > 0 ? importanceSum / total : 0 }
  }

  onConsolidation(callback: (report: ConsolidationReport) => void): void {
    this._consolidationCallbacks.push(callback)
  }

  notifyConsolidation(report: ConsolidationReport): void {
    for (const cb of this._consolidationCallbacks) cb(report)
  }

  clear(level?: MemoryLevel): void {
    if (level) this._tiers.set(level, [])
    else this._tiers.forEach((_, k) => this._tiers.set(k, []))
  }
}
