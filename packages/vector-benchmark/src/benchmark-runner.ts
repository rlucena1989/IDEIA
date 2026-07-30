import { createLogger } from '@ideia/logger';
import {  BenchmarkConfig, BenchmarkResult, SweepConfig, SweepResult,
  WorkloadProfile, IndexAlgorithm,
} from './types'
import { DatasetGenerator } from './dataset-generator'
import { IndexFactory } from './index-factory'
const logger = createLogger('benchmark-runner');

export class BenchmarkRunner {
  private _datasetGenerator: DatasetGenerator
  private _indexFactory: IndexFactory
  private _results: BenchmarkResult[] = []

  constructor() {
    this._datasetGenerator = new DatasetGenerator()
    this._indexFactory = new IndexFactory()
  }

  async run(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const errors: string[] = []
    const { vectors, ids } = await this._datasetGenerator.generate(config)
    const index = await this._indexFactory.create(config)
    let buildTime = 0
    try {
      buildTime = await index.build(vectors, ids)
    } catch (error: any) {
      errors.push(`Build error: ${error.message}`)
    }

    const queries: number[][] = []
    const groundTruth: number[][] = []
    for (let i = 0; i < config.queries; i++) {
      const q = this._datasetGenerator.generateQuery(config)
      queries.push(q)
      const distances = vectors.map((v, idx) => ({
        id: ids[idx],
        dist: this._computeDistance(q, v, config.distanceMetric),
      }))
      distances.sort((a, b) => a.dist - b.dist)
      groundTruth.push(distances.slice(0, config.topK * 2).map(d => d.id))
    }

    const latencies: number[] = []
    let totalCorrect = 0
    let totalQueries = 0
    const recallValues: number[] = []

    for (let i = 0; i < queries.length; i++) {
      const t0 = Date.now()
      let result: { ids: number[]; distances: number[] }
      try {
        result = await index.search(queries[i], config.topK, config.params)
      } catch (error: any) {
        errors.push(`Query error at ${i}: ${error.message}`)
        continue
      }
      latencies.push(Date.now() - t0)
      const correct = result.ids.filter(id => groundTruth[i].includes(id)).length
      totalCorrect += correct
      totalQueries++
      recallValues.push(correct / Math.min(config.topK, groundTruth[i].length))
    }

    latencies.sort((a, b) => a - b)
    const avgRecall = recallValues.length > 0
      ? recallValues.reduce((a, b) => a + b, 0) / recallValues.length
      : 0

    const result: BenchmarkResult = {
      algorithm: config.algorithm,
      dimension: config.dimension,
      datasetSize: config.datasetSize,
      buildTime: buildTime / 1000,
      buildTimeUnit: 's',
      memoryMB: Math.round(index.getMemoryUsage() / (1024 * 1024)),
      indexSizeMB: Math.round(index.getIndexSize() / (1024 * 1024)),
      queryLatency: {
        p50: latencies[Math.floor(latencies.length * 0.5)] || 0,
        p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
        p99: latencies[Math.floor(latencies.length * 0.99)] || 0,
        avg: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
        min: latencies[0] || 0,
        max: latencies[latencies.length - 1] || 0,
      },
      recall: { recallAt10: avgRecall, recallAt100: avgRecall },
      throughput: latencies.length > 0
        ? Math.round(1000 / (latencies.reduce((a, b) => a + b, 0) / latencies.length))
        : 0,
      params: config.params,
      timestamp: new Date(),
      error: errors.length > 0 ? errors.join('; ') : undefined,
    }

    this._results.push(result)
    await index.cleanup()
    return result
  }

  async runSweep(sweepConfig: SweepConfig): Promise<SweepResult> {
    const results: BenchmarkResult[] = []
    const keys = Object.keys(sweepConfig.paramGrid)
    const values = Object.values(sweepConfig.paramGrid)
    const combinations = this._cartesianProduct(values)

    for (const combo of combinations) {
      const params: Record<string, number> = {}
      for (let i = 0; i < keys.length; i++) {
        params[keys[i]] = combo[i]
      }
      const config: BenchmarkConfig = {
        algorithm: sweepConfig.algorithm,
        dimension: sweepConfig.dimension,
        datasetSize: sweepConfig.datasetSize,
        distanceMetric: 'cosine',
        datasetType: 'random',
        params,
        queries: 100,
        topK: 10,
        buildThreads: 4,
      }
      const result = await this.run(config)
      results.push(result)
    }

    const sorted = [...results].sort((a, b) => (b.recall.recallAt10 || 0) - (a.recall.recallAt10 || 0))
    const bestByMetric = sorted[0]
    const bestByTradeoff = [...results].sort((a, b) => {
      const aScore = (a.recall.recallAt10 || 0) / (a.queryLatency.p95 + 1)
      const bScore = (b.recall.recallAt10 || 0) / (b.queryLatency.p95 + 1)
      return bScore - aScore
    })[0]

    return {
      algorithm: sweepConfig.algorithm,
      paramCombinations: combinations.length,
      results,
      bestByMetric,
      bestByTradeoff,
    }
  }

  async runWorkload(profile: WorkloadProfile): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    for (const algo of ['hnsw', 'ivfflat', 'ivf_pq'] as const) {
      const params: Record<string, number> = algo === 'hnsw'
        ? { m: 16, ef_construction: 200, ef_search: profile.recallTarget > 0.95 ? 400 : 100 }
        : algo === 'ivfflat'
          ? { lists: Math.min(Math.floor(Math.sqrt(profile.datasetSize)), 1000), probes: 10 }
          : { nlist: Math.min(Math.floor(profile.datasetSize / 100), 500), m: 8, nbits: 8 }

      const config: BenchmarkConfig = {
        algorithm: algo,
        dimension: profile.dimension,
        datasetSize: profile.datasetSize,
        distanceMetric: 'cosine',
        datasetType: 'real_wiki',
        params,
        queries: 500,
        topK: 10,
        buildThreads: 4,
      }
      const result = await this.run(config)
      results.push(result)
    }
    return results
  }

  getAllResults(): BenchmarkResult[] {
    return [...this._results]
  }

  clearResults(): void {
    this._results = []
  }

  private _cartesianProduct(arrays: number[][]): number[][] {
    if (arrays.length === 0) return [[]]
    const [first, ...rest] = arrays
    const product = this._cartesianProduct(rest)
    const result: number[][] = []
    for (const v of first) {
      for (const p of product) {
        result.push([v, ...p])
      }
    }
    return result
  }

  private _computeDistance(a: number[], b: number[], metric: string): number {
    if (metric === 'l2') return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0))
    const dot = a.reduce((s, v, i) => s + v * b[i], 0)
    return 1 - dot
  }
}
