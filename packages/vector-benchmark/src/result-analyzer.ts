import { BenchmarkResult, IndexRecommendation, BenchmarkSummary, WorkloadType, IndexAlgorithm } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('result-analyzer');

export class ResultAnalyzer {
  summarize(results: BenchmarkResult[]): BenchmarkSummary {
    const algorithms = [...new Set(results.map(r => r.algorithm))]
    const byDimension = new Map<number, IndexRecommendation>()
    const byDatasetSize = new Map<number, IndexRecommendation>()
    const dims = [...new Set(results.map(r => r.dimension))]
    const sizes = [...new Set(results.map(r => r.datasetSize))]

    for (const dim of dims) {
      const dimResults = results.filter(r => r.dimension === dim)
      const best = this._findBest(dimResults)
      if (best) byDimension.set(dim, best)
    }

    for (const size of sizes) {
      const sizeResults = results.filter(r => r.datasetSize === size)
      const best = this._findBest(sizeResults)
      if (best) byDatasetSize.set(size, best)
    }

    const bestOverall = this._findBest(results) || {
      algorithm: 'hnsw' as IndexAlgorithm,
      params: {},
      expectedRecall: 0,
      expectedLatencyMs: 0,
      expectedMemoryMB: 0,
      confidence: 0,
      reasoning: 'Insufficient data',
    }

    return {
      totalRuns: results.length,
      algorithms,
      bestOverall,
      byDimension,
      byDatasetSize,
      byWorkload: new Map(),
      comparisonChart: this._generateChart(results),
    }
  }

  compare(a: BenchmarkResult, b: BenchmarkResult): string[] {
    const diffs: string[] = []
    const aRecall = a.recall.recallAt10 || 0
    const bRecall = b.recall.recallAt10 || 0
    const recallDiff = (aRecall - bRecall) * 100
    if (Math.abs(recallDiff) > 1) {
      diffs.push(`Recall: ${a.algorithm} ${recallDiff > 0 ? '+' : ''}${recallDiff.toFixed(1)}% vs ${b.algorithm}`)
    }
    const latencyDiff = b.queryLatency.p95 - a.queryLatency.p95
    if (Math.abs(latencyDiff) > 1) {
      diffs.push(`Latency P95: ${a.algorithm} ${latencyDiff > 0 ? 'faster' : 'slower'} by ${Math.abs(latencyDiff).toFixed(1)}ms`)
    }
    const buildDiff = b.buildTime - a.buildTime
    if (Math.abs(buildDiff) > 10) {
      diffs.push(`Build: ${a.algorithm} ${buildDiff > 0 ? 'faster' : 'slower'} by ${Math.abs(buildDiff).toFixed(0)}s`)
    }
    const memDiff = b.memoryMB - a.memoryMB
    diffs.push(`Memory: ${a.algorithm} uses ${memDiff > 0 ? 'less' : 'more'} by ${Math.abs(memDiff)}MB`)
    return diffs
  }

  private _findBest(results: BenchmarkResult[]): IndexRecommendation | null {
    if (results.length === 0) return null
    const scored = results.map(r => ({
      result: r,
      score: (r.recall.recallAt10 || 0) * 0.5 + (1 / (r.queryLatency.p95 + 1)) * 0.5,
    }))
    scored.sort((a, b) => b.score - a.score)
    const best = scored[0].result
    return {
      algorithm: best.algorithm,
      params: best.params,
      expectedRecall: best.recall.recallAt10 || 0,
      expectedLatencyMs: best.queryLatency.p95,
      expectedMemoryMB: best.memoryMB,
      confidence: scored[0].score,
      reasoning: `Best trade-off for dataset size ${best.datasetSize}, dim ${best.dimension}`,
    }
  }

  private _generateChart(results: BenchmarkResult[]): string {
    const lines: string[] = ['Algorithm Comparison:']
    for (const r of results) {
      const recall = ((r.recall.recallAt10 || 0) * 100).toFixed(1)
      const latency = r.queryLatency.p95.toFixed(1)
      const mem = r.memoryMB
      lines.push(`  ${r.algorithm.padEnd(10)} Recall: ${recall}%  P95: ${latency}ms  Mem: ${mem}MB`)
    }
    return lines.join('\n')
  }
}
