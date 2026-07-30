import { createLogger } from '@ideia/logger'
import { MemoryEntry, MemoryLevel, ConsolidationReport, CompressedMemory } from './types'
import { NeuralMemoryCompressor } from './neural-compressor'
import { CoherenceManager } from './coherence-manager'

const logger = createLogger('agent-memory:sleep')

export class SleepConsolidationEngine {
  private _compressor = new NeuralMemoryCompressor()
  private _coherenceManager = new CoherenceManager()

  async consolidate(tiers: Map<MemoryLevel, MemoryEntry[]>): Promise<ConsolidationReport> {
    const start = Date.now()
    let consolidated = 0, archived = 0, removed = 0

    for (const [level, entries] of tiers) {
      if (entries.length < 10) continue
      if (level === 'l0_context' || level === 'l1_cache' || level === 'l2_cache') {
        const result = this._compressor.compress(entries, 0.3)
        archived += (result.archived ?? []).length
        const keptIds = new Set((result.entries ?? []).map((e: any) => e.id))
        const survivors = entries.filter(e => keptIds.has(e.id))
        tiers.set(level, survivors)
        consolidated += entries.length - survivors.length
      }
    }

    const report: ConsolidationReport = { timestamp: Date.now(), memoriesProcessed: 0, memoriesPromoted: 0, patternsExtracted: 0, promoted: [], patterns: [], replayed: 0, durationMs: Date.now() - start, consolidated, archived, removed, tiersBalanced: true }
    logger.info(`Sleep consolidation completed in ${Date.now() - start}ms`, { consolidated, archived })
    return report
  }

  getCompressor(): NeuralMemoryCompressor { return this._compressor }
  getCoherenceManager(): CoherenceManager { return this._coherenceManager }
}
