import { DatasetGenerator } from '../src/dataset-generator'
import { HNSWBenchmark, IVFFlatBenchmark, IVFPQBenchmark } from '../src/index-factory'
import { BenchmarkRunner } from '../src/benchmark-runner'
import { RecallCalculator } from '../src/recall-calculator'
import { LatencyProfiler } from '../src/latency-profiler'
import { ThroughputMeter } from '../src/throughput-meter'
import { AutoTuner } from '../src/auto-tuner'
import { DiskANNBenchmarkStandalone } from '../src/diskann-benchmark'
import { FreshQNNIndex } from '../src/fresh-qnn-index'
import { AdaptiveIndexSelector } from '../src/adaptive-index-selector'
import { ResultAnalyzer } from '../src/result-analyzer'
import { VectorIndexBenchmark } from '../src/vector-index-benchmark'
import { BenchmarkConfig, WorkloadProfile } from '../src/types'

describe('DatasetGenerator', () => {
  const gen = new DatasetGenerator()

  it('generates random dataset', async () => {
    const { vectors, ids } = await gen.generate({ algorithm: 'hnsw', dimension: 4, datasetSize: 10, distanceMetric: 'cosine', datasetType: 'random', params: {}, queries: 0, topK: 0, buildThreads: 1 })
    expect(vectors).toHaveLength(10)
    expect(ids).toHaveLength(10)
    expect(vectors[0]).toHaveLength(4)
  })

  it('generates wiki-like dataset', async () => {
    const { vectors, ids } = await gen.generate({ algorithm: 'hnsw', dimension: 8, datasetSize: 20, distanceMetric: 'cosine', datasetType: 'real_wiki', params: {}, queries: 0, topK: 0, buildThreads: 1 })
    expect(vectors.length).toBe(20)
    expect(ids.length).toBe(20)
  })

  it('generates arxiv-like dataset', async () => {
    const { vectors } = await gen.generate({ algorithm: 'hnsw', dimension: 8, datasetSize: 15, distanceMetric: 'cosine', datasetType: 'real_arxiv', params: {}, queries: 0, topK: 0, buildThreads: 1 })
    expect(vectors.length).toBe(15)
  })

  it('generates adversarial dataset', async () => {
    const { vectors, ids } = await gen.generate({ algorithm: 'hnsw', dimension: 4, datasetSize: 10, distanceMetric: 'cosine', datasetType: 'adversarial', params: {}, queries: 0, topK: 0, buildThreads: 1 })
    expect(vectors.length).toBe(10)
    expect(ids.length).toBe(10)
  })

  it('generates query vector', () => {
    const q = gen.generateQuery({ algorithm: 'hnsw', dimension: 4, datasetSize: 10, distanceMetric: 'cosine', datasetType: 'random', params: {}, queries: 0, topK: 0, buildThreads: 1 })
    expect(q).toHaveLength(4)
    const norm = Math.sqrt(q.reduce((s, v) => s + v * v, 0))
    expect(norm).toBeCloseTo(1, 1)
  })
})

describe('HNSWBenchmark', () => {
  const cfg: BenchmarkConfig = { algorithm: 'hnsw', dimension: 4, datasetSize: 10, distanceMetric: 'cosine', datasetType: 'random', params: { m: 4, ef_construction: 50 }, queries: 0, topK: 0, buildThreads: 1 }
  const index = new HNSWBenchmark(cfg)

  it('builds index and returns build time', async () => {
    const vectors = Array.from({ length: 10 }, () => Array.from({ length: 4 }, () => Math.random() * 2 - 1))
    const ids = Array.from({ length: 10 }, (_, i) => i)
    const time = await index.build(vectors, ids)
    expect(time).toBeGreaterThanOrEqual(0)
  })

  it('searches and returns results', async () => {
    const result = await index.search([0.1, 0.2, 0.3, 0.4], 3, { ef_search: 50 })
    expect(result.ids.length).toBeLessThanOrEqual(3)
    expect(result.distances.length).toBeLessThanOrEqual(3)
  })

  it('returns memory usage', () => {
    expect(index.getMemoryUsage()).toBeGreaterThan(0)
  })

  it('cleans up', async () => {
    await expect(index.cleanup()).resolves.toBeUndefined()
  })
})

describe('IVFFlatBenchmark', () => {
  const cfg: BenchmarkConfig = { algorithm: 'ivfflat', dimension: 4, datasetSize: 10, distanceMetric: 'cosine', datasetType: 'random', params: { lists: 3, probes: 2 }, queries: 0, topK: 0, buildThreads: 1 }

  it('builds and searches', async () => {
    const index = new IVFFlatBenchmark(cfg)
    const vectors = Array.from({ length: 10 }, () => Array.from({ length: 4 }, () => Math.random() * 2 - 1))
    const ids = Array.from({ length: 10 }, (_, i) => i)
    const time = await index.build(vectors, ids)
    expect(time).toBeGreaterThanOrEqual(0)
    const result = await index.search([0.1, 0.2, 0.3, 0.4], 5, { probes: 2 })
    expect(result.ids.length).toBeLessThanOrEqual(5)
    await index.cleanup()
  })
})

describe('IVFPQBenchmark', () => {
  it('builds and searches with product quantization', async () => {
    const cfg: BenchmarkConfig = { algorithm: 'ivf_pq', dimension: 8, datasetSize: 10, distanceMetric: 'cosine', datasetType: 'random', params: { nlist: 3, m: 4, nbits: 4 }, queries: 0, topK: 0, buildThreads: 1 }
    const index = new IVFPQBenchmark(cfg)
    const vectors = Array.from({ length: 10 }, () => Array.from({ length: 8 }, () => Math.random() * 2 - 1))
    const ids = Array.from({ length: 10 }, (_, i) => i)
    const time = await index.build(vectors, ids)
    expect(time).toBeGreaterThanOrEqual(0)
    const result = await index.search([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], 3, { probes: 2 })
    expect(result.ids.length).toBeLessThanOrEqual(3)
    await index.cleanup()
  })
})

describe('BenchmarkRunner', () => {
  const runner = new BenchmarkRunner()

  it('runs a full benchmark', async () => {
    const config: BenchmarkConfig = { algorithm: 'hnsw', dimension: 4, datasetSize: 10, distanceMetric: 'cosine', datasetType: 'random', params: { m: 4, ef_construction: 50 }, queries: 5, topK: 3, buildThreads: 1 }
    const result = await runner.run(config)
    expect(result.algorithm).toBe('hnsw')
    expect(result.buildTime).toBeGreaterThanOrEqual(0)
    expect(result.queryLatency).toBeDefined()
    expect(result.throughput).toBeGreaterThanOrEqual(0)
    expect(result.timestamp).toBeInstanceOf(Date)
  })

  it('runs sweep over parameters', async () => {
    const sweep = await runner.runSweep({ algorithm: 'hnsw', dimension: 4, datasetSize: 5, paramGrid: { m: [4, 8], ef_construction: [50, 100] }, metric: 'recallAt10' })
    expect(sweep.paramCombinations).toBe(4)
    expect(sweep.bestByMetric).toBeDefined()
    expect(sweep.bestByTradeoff).toBeDefined()
  })

  it('runs workload and returns results', async () => {
    const profile: WorkloadProfile = { name: 'oltp', datasetSize: 10, dimension: 4, qps: 100, insertRate: 10, recallTarget: 0.95, latencyTargetMs: 10, memoryLimitMB: 4096 }
    const results = await runner.runWorkload(profile)
    expect(results.length).toBe(3)
  })
})

describe('RecallCalculator', () => {
  const calc = new RecallCalculator()

  it('calculates recall@k', () => {
    const r = calc.calculateAtK([1, 2, 3, 4, 5], [1, 2, 6, 7, 8], 5)
    expect(r).toBe(0.4)
  })

  it('calculates precision@k', () => {
    const r = calc.calculatePrecisionAtK([1, 2, 3, 4, 5], [1, 2, 6, 7, 8], 5)
    expect(r).toBe(0.4)
  })

  it('calculates mean average precision', () => {
    const r = calc.calculateMeanAveragePrecision([
      { groundTruth: [1, 2, 3], actual: [1, 2, 3] },
      { groundTruth: [1, 2, 3], actual: [3, 2, 1] },
    ])
    expect(r).toBeGreaterThan(0)
  })
})

describe('LatencyProfiler', () => {
  const profiler = new LatencyProfiler()

  it('computes latency percentiles', () => {
    const stats = profiler.profile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(stats.min).toBe(1)
    expect(stats.max).toBe(10)
    expect(stats.p95).toBeGreaterThanOrEqual(9)
    expect(stats.p99).toBeGreaterThanOrEqual(9)
    expect(stats.stddev).toBeGreaterThan(0)
  })
})

describe('ThroughputMeter', () => {
  const meter = new ThroughputMeter()

  it('measures throughput from queries and time', () => {
    const t = meter.measure(100, 1000)
    expect(t).toBe(100)
  })

  it('measures throughput from batch latencies', () => {
    const t = meter.measureBatch([10, 10, 10, 10, 10])
    expect(t).toBe(100)
  })

  it('estimates max throughput', () => {
    const t = meter.estimateMaxThroughput(10, 5)
    expect(t).toBe(500)
  })
})

describe('AutoTuner', () => {
  const runner = new BenchmarkRunner()
  const tuner = new AutoTuner(runner)

  it('recommends index for workload', async () => {
    const profile: WorkloadProfile = { name: 'oltp', datasetSize: 10, dimension: 4, qps: 100, insertRate: 10, recallTarget: 0.95, latencyTargetMs: 10, memoryLimitMB: 4096 }
    const rec = await tuner.recommend(profile)
    expect(rec.algorithm).toBeDefined()
    expect(rec.confidence).toBeGreaterThan(0)
    expect(rec.reasoning).toBeDefined()
  })
})

describe('DiskANNBenchmarkStandalone', () => {
  const diskann = new DiskANNBenchmarkStandalone()

  it('returns benchmark summary', () => {
    const summary = diskann.benchmarkDiskANN(100000, 768)
    expect(summary.datasetSize).toBe(100000)
    expect(summary.buildTimeSec).toBeGreaterThan(0)
    expect(summary.recallAt10).toBeGreaterThan(0)
  })
})

describe('FreshQNNIndex', () => {
  const idx = new FreshQNNIndex(8, 4)

  it('inserts and searches', async () => {
    await idx.insert(1, Array.from({ length: 8 }, () => Math.random()))
    const results = await idx.search(Array.from({ length: 8 }, () => Math.random()), 5)
    expect(results.length).toBeGreaterThanOrEqual(0)
  })

  it('returns staleness report', () => {
    const report = idx.getStalenessReport()
    expect(report.length).toBeGreaterThanOrEqual(0)
  })
})

describe('AdaptiveIndexSelector', () => {
  const selector = new AdaptiveIndexSelector()

  it('records and selects index', () => {
    selector.record('oltp', 'hnsw', 5, 0.97)
    const rec = selector.select(10000, 384, 10, 0.95)
    expect(rec.algorithm).toBe('hnsw')
    expect(rec.confidence).toBeGreaterThan(0)
  })

  it('returns workload profile', () => {
    const profile = selector.getWorkloadProfile()
    expect(profile.totalQueries).toBeGreaterThan(0)
  })
})

describe('ResultAnalyzer', () => {
  const analyzer = new ResultAnalyzer()

  it('summarizes results', () => {
    const results = [{
      algorithm: 'hnsw' as const, dimension: 4, datasetSize: 10, buildTime: 1, buildTimeUnit: 's', memoryMB: 100, indexSizeMB: 50,
      queryLatency: { p50: 1, p95: 2, p99: 3, avg: 1.5, min: 1, max: 3 },
      recall: { recallAt10: 0.95, recallAt100: 0.9 },
      throughput: 100, params: { m: 16 }, timestamp: new Date(),
    }]
    const summary = analyzer.summarize(results)
    expect(summary.totalRuns).toBe(1)
    expect(summary.bestOverall.algorithm).toBe('hnsw')
  })

  it('compares two results', () => {
    const a = { algorithm: 'hnsw' as const, dimension: 4, datasetSize: 10, buildTime: 1, buildTimeUnit: 's', memoryMB: 100, indexSizeMB: 50,
      queryLatency: { p50: 1, p95: 2, p99: 3, avg: 1.5, min: 1, max: 3 },
      recall: { recallAt10: 0.95, recallAt100: 0.9 }, throughput: 100, params: { m: 16 }, timestamp: new Date() }
    const b = { algorithm: 'ivfflat' as const, dimension: 4, datasetSize: 10, buildTime: 5, buildTimeUnit: 's', memoryMB: 50, indexSizeMB: 25,
      queryLatency: { p50: 10, p95: 20, p99: 30, avg: 15, min: 10, max: 30 },
      recall: { recallAt10: 0.8, recallAt100: 0.75 }, throughput: 50, params: { lists: 100 }, timestamp: new Date() }
    const diffs = analyzer.compare(a, b)
    expect(diffs.length).toBeGreaterThan(0)
  })
})

describe('VectorIndexBenchmark', () => {
  const engine = new VectorIndexBenchmark()

  it('runs a comparison', async () => {
    const summary = await engine.runComparison([4], [5], ['hnsw', 'ivfflat'])
    expect(summary.totalRuns).toBe(2)
    expect(summary.algorithms.length).toBe(2)
  })

  it('compares two results', async () => {
    const configA: BenchmarkConfig = { algorithm: 'hnsw', dimension: 4, datasetSize: 5, distanceMetric: 'cosine', datasetType: 'random', params: { m: 4, ef_construction: 50 }, queries: 3, topK: 2, buildThreads: 1 }
    const configB: BenchmarkConfig = { algorithm: 'ivfflat', dimension: 4, datasetSize: 5, distanceMetric: 'cosine', datasetType: 'random', params: { lists: 3, probes: 2 }, queries: 3, topK: 2, buildThreads: 1 }
    const resultA = await engine.run(configA)
    const resultB = await engine.run(configB)
    const diffs = engine.compareTwo(resultA, resultB)
    expect(diffs.length).toBeGreaterThan(0)
  })
})
