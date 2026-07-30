export interface Chunk {
  text: string;
  tokens: number;
  strategy: string;
}

export interface EmbeddingModel {
  name: string;
  dimensions: number;
  costPer1KTokens: number;
  quality: 'low' | 'medium' | 'high';
  local: boolean;
  maxTokens: number;
}

export interface EmbeddingResult {
  id: string;
  text: string;
  embedding: number[];
  model: string;
  dimensions: number;
  chunkStrategy: string;
  tokens: number;
  cost: number;
  cached: boolean;
  timestamp: number;
}

export interface PipelineConfig {
  defaultModel: string;
  defaultQuality: 'low' | 'medium' | 'high' | 'auto';
  maxChunkSize: number;
  batchSize: number;
  enableCache: boolean;
  cacheTTLDays: number;
}

export interface ModelStats {
  totalTokens: number;
  totalCost: number;
  totalCalls: number;
  cacheHits: number;
  lastUsed: number;
}

export interface IndexConfig {
  type: 'hnsw' | 'ivfflat' | 'flat';
  dimensions: number;
  numLists?: number;
  m?: number;
  efConstruction?: number;
  distance: 'L2' | 'cosine' | 'ip';
}

export interface ONNXOptimizationConfig {
  quantization: 'fp32' | 'fp16' | 'int8';
  graphOptimization: 'basic' | 'extended' | 'all';
  executionProvider: 'cpu' | 'cuda' | 'tensorrt';
  intraOpThreads: number;
  interOpThreads: number;
}

export interface OptimizationPlan {
  config: ONNXOptimizationConfig;
  estimatedSpeedup: number;
  estimatedMemoryReduction: number;
  steps: string[];
}

export interface ONNXBenchmarkResult {
  modelDim: number;
  provider: string;
  quantization: string;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  memoryMB: number;
}
