export type IndexAlgorithm = 'hnsw' | 'ivfflat' | 'ivf_pq' | 'diskann'
export type DistanceMetric = 'l2' | 'cosine' | 'inner_product'
export type DatasetType = 'random' | 'real_wiki' | 'real_arxiv' | 'adversarial'
export type WorkloadType = 'oltp' | 'olap' | 'mixed' | 'streaming'

export interface BenchmarkConfig {
  algorithm: IndexAlgorithm
  dimension: number
  datasetSize: number
  distanceMetric: DistanceMetric
  datasetType: DatasetType
  params: Record<string, number>
  queries: number
  topK: number
  buildThreads: number
  M?: number;
  efConstruction?: number;
  metric?: string;
  nCentroids?: number;
}

export type BenchmarkSuite = {
  configs: BenchmarkConfig[];
  data: VectorPoint[];
  queries: SearchQuery[];
  name: string;
};

export interface BenchmarkResult {
  algorithm: IndexAlgorithm
  dimension: number
  datasetSize: number
  buildTime: number
  buildTimeUnit: string
  memoryMB: number
  indexSizeMB: number
  queryLatency: {
    p50: number
    p95: number
    p99: number
    avg: number
    min: number
    max: number
  }
  indexType?: string;
  recall: Record<string, number>
  throughput: number
  params: Record<string, number>
  timestamp: Date
  error?: string
}

export interface RecallMetrics {
  recallAt1: number
  recallAt5: number
  recallAt10: number
  recallAt100: number
  precisionAt10: number
  meanAveragePrecision: number
}

export interface SweepConfig {
  algorithm: IndexAlgorithm
  dimension: number
  datasetSize: number
  paramGrid: Record<string, number[]>
  metric: string
}

export interface SweepResult {
  algorithm: IndexAlgorithm
  paramCombinations: number
  results: BenchmarkResult[]
  bestByMetric: BenchmarkResult
  bestByTradeoff: BenchmarkResult
}

export interface IndexRecommendation {
  algorithm: IndexAlgorithm
  params: Record<string, number>
  expectedRecall: number
  expectedLatencyMs: number
  expectedMemoryMB: number
  confidence: number
  reasoning: string
}

export interface WorkloadProfile {
  name: WorkloadType
  datasetSize: number
  dimension: number
  qps: number
  insertRate: number
  recallTarget: number
  latencyTargetMs: number
  memoryLimitMB: number
}

export interface BenchmarkSummary {
  totalRuns: number
  algorithms: IndexAlgorithm[]
  bestOverall: IndexRecommendation
  byDimension: Map<number, IndexRecommendation>
  byDatasetSize: Map<number, IndexRecommendation>
  byWorkload: Map<WorkloadType, IndexRecommendation>
  comparisonChart: string
}

export interface IndexHandle {
  build(vectors: number[][], ids: number[]): Promise<number>
  search(query: number[], topK: number, params: Record<string, number>): Promise<{ ids: number[]; distances: number[] }>
  insert(vector: number[], id: number): Promise<void>
  delete(id: number): Promise<void>
  getMemoryUsage(): number
  getIndexSize(): number
  cleanup(): Promise<void>
}

export interface DiskANNConfig {
  R: number
  L: number
  alpha: number
}

export interface DiskANNResult {
  ids: number[]
  distances: number[]
  visitedNodes: number
  ioOperations: number
}

export interface DiskANNSummary {
  datasetSize: number
  dimension: number
  buildTimeSec: number
  queryLatencyMs: number
  recallAt10: number
  memoryMB: number
  ssdGB: number
}

export interface WorkloadProfileSummary {
  totalQueries: number
  queryTypeDistribution: Record<string, number>
  averageLatency: number
  averageRecall: number
}


export interface IndexConfig {
  algorithm: IndexAlgorithm;
  dimension: number;
  distanceMetric: DistanceMetric;
  params: Record<string, number>;
  memoryLimitMB: number;
  type?: string;
  dimensions?: number;
}


export interface VectorPoint {
  id: number;
  vector: number[];
  metadata?: Record<string, unknown>;
}

export interface SearchQuery {
  vector: number[];
  topK: number;
  filter?: Record<string, unknown>;
}


