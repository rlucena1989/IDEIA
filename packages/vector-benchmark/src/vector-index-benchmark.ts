import { createLogger } from '@ideia/logger'
import {
  BenchmarkConfig, BenchmarkResult, BenchmarkSummary,
  SweepConfig, SweepResult, WorkloadProfile, IndexRecommendation, IndexAlgorithm,
} from './types'
import { BenchmarkRunner } from './benchmark-runner'
import { AutoTuner } from './auto-tuner'
import { ResultAnalyzer } from './result-analyzer'

const log = createLogger('vector-index-benchmark')

export class VectorIndexBenchmark {
  private _runner: BenchmarkRunner
  private _tuner: AutoTuner
  private _analyzer: ResultAnalyzer

  constructor() {
    this._runner = new BenchmarkRunner()
    this._tuner = new AutoTuner(this._runner)
    this._analyzer = new ResultAnalyzer()
  }

  async run(config: BenchmarkConfig): Promise<BenchmarkResult> {
    log.info(`Running benchmark: ${config.algorithm} (${config.datasetSize}x${config.dimension})`)
    const result = await this._runner.run(config)
    log.info(`Result: recall=${((result.recall.recallAt10 || 0) * 100).toFixed(1)}%, P95=${result.queryLatency.p95}ms`)
    return result
  }

  async runComparison(
    dimensions: number[],
    datasetSizes: number[],
    algorithms: string[],
  ): Promise<BenchmarkSummary> {
    const allResults: BenchmarkResult[] = []
    for (const dim of dimensions) {
      for (const size of datasetSizes) {
        for (const algo of algorithms) {
          const config: BenchmarkConfig = {
            algorithm: algo as IndexAlgorithm,
            dimension: dim,
            datasetSize: size,
            distanceMetric: 'cosine',
            datasetType: 'random',
            params: algo === 'hnsw' ? { m: 16, ef_construction: 200 } : { lists: 100, probes: 10 },
            queries: 200,
            topK: 10,
            buildThreads: 4,
          }
          const result = await this.run(config)
          allResults.push(result)
        }
      }
    }
    return this._analyzer.summarize(allResults)
  }

  async autoTune(algorithm: string, dimension: number, datasetSize: number): Promise<SweepResult> {
    log.info(`Auto-tuning ${algorithm} for ${datasetSize}x${dimension}`)
    const paramGrid: Record<string, number[]> = algorithm === 'hnsw'
      ? { m: [4, 8, 16, 32, 64], ef_construction: [50, 100, 200, 400, 800] }
      : { lists: [50, 100, 200, 500, 1000], probes: [1, 5, 10, 20, 50] }

    const sweepConfig: SweepConfig = {
      algorithm: algorithm as IndexAlgorithm,
      dimension,
      datasetSize,
      paramGrid,
      metric: 'recallAt10',
    }

    const result = await this._runner.runSweep(sweepConfig)
    log.info(`Best params: ${JSON.stringify(result.bestByMetric.params)}`)
    return result
  }

  async recommendForWorkload(profile: WorkloadProfile): Promise<IndexRecommendation> {
    log.info(`Recommending index for workload: ${profile.name}`)
    return this._tuner.recommend(profile)
  }

  compareTwo(a: BenchmarkResult, b: BenchmarkResult): string[] {
    return this._analyzer.compare(a, b)
  }

  getRunner(): BenchmarkRunner {
    return this._runner
  }
}
