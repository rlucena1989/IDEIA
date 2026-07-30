import { MemoryEntry, MemoryLevel, HierarchicalResult } from './types'

export class HierarchicalAttentionRetriever {
  retrieve(tiers: Map<MemoryLevel, MemoryEntry[]>, query: string, topK = 5): HierarchicalResult {
    const allEntries: { entry: MemoryEntry; score: number }[] = []
    const q = query.toLowerCase()

    for (const [level, entries] of tiers) {
      for (const entry of entries) {
        let score = 0
        if (entry.content.toLowerCase().includes(q)) score += entry.importance * 0.6
        if (entry.tags.some(t => t.toLowerCase().includes(q))) score += entry.importance * 0.3
        if (entry.source.toLowerCase().includes(q)) score += 0.1
        allEntries.push({ entry, score: score + this._levelBoost(level) })
      }
    }

    allEntries.sort((a, b) => b.score - a.score)
    const topEntries = allEntries.slice(0, topK)
    const results = topEntries.map(e => ({ content: e.entry.content, tier: e.entry.level, score: e.score }))
    const byTier = new Map<string, Array<{ content: string; score: number }>>()
    for (const { entry, score } of topEntries) {
      const tier = entry.level
      if (!byTier.has(tier)) byTier.set(tier, [])
      byTier.get(tier)!.push({ content: entry.content, score })
    }
    const attentionDistribution: Record<string, number> = {}
    for (const { entry, score } of allEntries) {
      attentionDistribution[entry.level] = (attentionDistribution[entry.level] ?? 0) + score
    }
    return {
      query,
      topK,
      results,
      byTier,
      attentionDistribution,
      totalCandidates: allEntries.length,
      entries: results,
    }
  }

  private _levelBoost(level: MemoryLevel): number {
    const boosts: Record<MemoryLevel, number> = {
      'l0_context': 0.5, 'l1_cache': 0.4, 'l2_cache': 0.35,
      'l3_working': 0.3, 'l4_episodic': 0.2, 'l5_semantic': 0.15, 'l6_persistent': 0.1,
    }
    return boosts[level] || 0
  }
}
