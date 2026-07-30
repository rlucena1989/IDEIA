import { IndexRecommendation, IndexAlgorithm, WorkloadProfileSummary } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('adaptive-index-selector');

export class AdaptiveIndexSelector {
  private _workloadHistory: Array<{ queryType: string; latency: number; recall: number; indexUsed: string }> = []
  private _indexPerformance = new Map<string, { totalLatency: number; totalRecall: number; count: number }>()

  record(queryType: string, indexUsed: string, latency: number, recall: number): void {
    this._workloadHistory.push({ queryType, latency, recall, indexUsed })
    const stats = this._indexPerformance.get(indexUsed) || { totalLatency: 0, totalRecall: 0, count: 0 }
    stats.totalLatency += latency
    stats.totalRecall += recall
    stats.count++
    this._indexPerformance.set(indexUsed, stats)
  }

  select(datasetSize: number, dim: number, latencyTarget: number, recallTarget: number): IndexRecommendation {
    const candidates: Array<{ name: IndexAlgorithm; params: Record<string, number>; recall: number; latency: number; memoryMB: number }> = [
      {
        name: 'hnsw',
        params: { m: 16, ef_construction: 200 },
        recall: 0.97, latency: 3,
        memoryMB: datasetSize * dim * 4 / 1024 / 1024,
      },
      {
        name: 'ivfflat',
        params: { lists: Math.min(1000, Math.floor(datasetSize / 100)), probes: 10 },
        recall: 0.85, latency: 20,
        memoryMB: datasetSize * dim * 4 / 1024 / 1024 * 0.5,
      },
      {
        name: 'diskann',
        params: { R: 64, L: 128 },
        recall: 0.95, latency: 5,
        memoryMB: 512,
      },
    ]

    const scored = candidates.map(c => {
      const historical = this._indexPerformance.get(c.name)
      const avgRecall = historical ? historical.totalRecall / historical.count : c.recall
      const avgLatency = historical ? historical.totalLatency / historical.count : c.latency
      const recallScore = avgRecall / recallTarget
      const latencyScore = latencyTarget / avgLatency
      const overall = recallScore * 0.6 + Math.min(1, latencyScore) * 0.4
      return { name: c.name, params: c.params, recall: c.recall, latency: c.latency, memoryMB: c.memoryMB, avgRecall, avgLatency, score: overall }
    })

    scored.sort((a, b) => b.score - a.score)
    const best = scored[0]

    return {
      algorithm: best.name,
      params: best.params,
      expectedRecall: best.avgRecall,
      expectedLatencyMs: best.avgLatency,
      expectedMemoryMB: best.memoryMB,
      confidence: best.score,
      reasoning: `Selected ${best.name}: recall ${(best.avgRecall * 100).toFixed(0)}% target ${(recallTarget * 100).toFixed(0)}%, latency ${best.avgLatency}ms target ${latencyTarget}ms, score ${(best.score * 100).toFixed(0)}%`,
    }
  }

  getWorkloadProfile(): WorkloadProfileSummary {
    const types = new Map<string, number>()
    for (const w of this._workloadHistory) {
      types.set(w.queryType, (types.get(w.queryType) || 0) + 1)
    }
    return {
      totalQueries: this._workloadHistory.length,
      queryTypeDistribution: Object.fromEntries(types),
      averageLatency: this._workloadHistory.reduce((s, w) => s + w.latency, 0) / Math.max(1, this._workloadHistory.length),
      averageRecall: this._workloadHistory.reduce((s, w) => s + w.recall, 0) / Math.max(1, this._workloadHistory.length),
    }
  }

  resetHistory(): void {
    this._workloadHistory = []
    this._indexPerformance.clear()
  }
}
