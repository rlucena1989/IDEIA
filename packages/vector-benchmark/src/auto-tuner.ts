import { IndexAlgorithm, WorkloadProfile, IndexRecommendation, BenchmarkResult } from './types'
import { createLogger } from '@ideia/logger';
import { BenchmarkRunner } from './benchmark-runner'
const logger = createLogger('auto-tuner');

export class AutoTuner {
  private _history: Map<string, BenchmarkResult[]> = new Map()

  constructor(private _runner: BenchmarkRunner) {}

  async tune(algorithm: IndexAlgorithm, dimension: number, datasetSize: number): Promise<{ bestParams: Record<string, number>; bestRecall: number }> {
    const paramGrid: Record<string, number[]> = algorithm === 'hnsw'
      ? { m: [4, 8, 16, 32, 64], ef_construction: [50, 100, 200, 400, 800] }
      : { lists: [50, 100, 200, 500, 1000], probes: [1, 5, 10, 20, 50] }

    const sweepResult = await this._runner.runSweep({
      algorithm,
      dimension,
      datasetSize,
      paramGrid,
      metric: 'recallAt10',
    })

    return {
      bestParams: sweepResult.bestByMetric.params,
      bestRecall: sweepResult.bestByMetric.recall.recallAt10 || 0,
    }
  }

  async recommend(profile: WorkloadProfile): Promise<IndexRecommendation> {
    const results = await this._runner.runWorkload(profile)
    const key = `${profile.name}_${profile.datasetSize}_${profile.dimension}`
    this._history.set(key, results)

    const scored = results.map(r => {
      const recallScore = (r.recall.recallAt10 || 0) / profile.recallTarget
      const latencyScore = profile.latencyTargetMs / (r.queryLatency.p95 || 1)
      const memoryScore = profile.memoryLimitMB / (r.memoryMB || 1)
      const throughputScore = r.throughput / profile.qps
      const overallScore = recallScore * 0.4 + latencyScore * 0.3 + Math.min(1, memoryScore) * 0.15 + Math.min(1, throughputScore) * 0.15
      return { result: r, score: overallScore }
    })

    scored.sort((a, b) => b.score - a.score)
    const best = scored[0]

    return {
      algorithm: best.result.algorithm,
      params: best.result.params,
      expectedRecall: best.result.recall.recallAt10 || 0,
      expectedLatencyMs: best.result.queryLatency.p95,
      expectedMemoryMB: best.result.memoryMB,
      confidence: best.score,
      reasoning: `${best.result.algorithm.toUpperCase()} selected for ${profile.name}. Score: ${(best.score * 100).toFixed(0)}/100`,
    }
  }
}
