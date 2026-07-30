import { createLogger } from '@ideia/logger'
import { AgentResult } from './types'

const logger = createLogger('result-fusion')

export interface WeightedResult<T> {
  value: T
  weight: number
}

export interface MergedResult<T> {
  value: T
  confidence: number
  method: 'vote' | 'average' | 'best-confidence'
}

export interface NamedResult<T> {
  agentId: string
  result: AgentResult<T>
}

export class ResultFusion {
  private historicalConfidence: Map<string, number> = new Map()

  setHistoricalConfidence(agentId: string, confidence: number): void {
    this.historicalConfidence.set(agentId, confidence)
  }

  merge<T>(results: NamedResult<T>[]): MergedResult<T> {
    if (results.length === 0) {
      throw new Error('Cannot merge empty results')
    }

    if (results.length === 1) {
      return {
        value: results[0].result.output,
        confidence: results[0].result.metrics.confidence,
        method: 'best-confidence',
      }
    }

    const weighted: WeightedResult<T>[] = results.map(r => ({
      value: r.result.output,
      weight: this.historicalConfidence.get(r.agentId) ?? 0.5,
    }))

    const sample = results[0].result.output
    if (this.isCategorical(sample)) {
      return this.weightedVote(weighted)
    }
    if (this.isNumeric(sample)) {
      return this.weightedAverage(weighted as WeightedResult<number>[]) as MergedResult<T>
    }
    return this.bestConfidence(weighted)
  }

  private isCategorical(value: unknown): boolean {
    return typeof value === 'string' || value === null || value === undefined
  }

  private isNumeric(value: unknown): boolean {
    return typeof value === 'number'
  }

  private weightedVote<T>(weighted: WeightedResult<T>[]): MergedResult<T> {
    const tally = new Map<string, { value: T; totalWeight: number }>()
    for (const w of weighted) {
      const key = JSON.stringify(w.value)
      const existing = tally.get(key)
      if (existing) {
        existing.totalWeight += w.weight
      } else {
        tally.set(key, { value: w.value, totalWeight: w.weight })
      }
    }
    const best = Array.from(tally.values()).reduce((a, b) =>
      a.totalWeight > b.totalWeight ? a : b,
    )
    const totalWeight = weighted.reduce((s, w) => s + w.weight, 0)
    return {
      value: best.value,
      confidence: totalWeight > 0 ? best.totalWeight / totalWeight : 0,
      method: 'vote',
    }
  }

  private weightedAverage(weighted: WeightedResult<number>[]): MergedResult<number> {
    const totalWeight = weighted.reduce((s, w) => s + w.weight, 0)
    if (totalWeight === 0) {
      return { value: weighted[0].value, confidence: 0, method: 'average' }
    }
    const avg = weighted.reduce((s, w) => s + w.value * w.weight, 0) / totalWeight
    return { value: avg, confidence: totalWeight / weighted.length, method: 'average' }
  }

  private bestConfidence<T>(weighted: WeightedResult<T>[]): MergedResult<T> {
    const best = weighted.reduce((a, b) => (a.weight > b.weight ? a : b))
    return { value: best.value, confidence: best.weight, method: 'best-confidence' }
  }
}
