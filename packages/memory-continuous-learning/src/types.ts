export enum MemoryLevel {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  L4 = 'L4',
  L5 = 'L5',
}

export interface MemoryEntry {
  key: string;
  content: string;
  importance: number;
  timestamp: number;
  tier?: string;
  metadata?: Record<string, unknown>;
}

export interface CompactedMemory {
  originalCount: number;
  compactedCount: number;
  compressionRatio: number;
  level: number;
  retained: MemoryEntry[];
  summaries: string[];
  temporalClusters: Array<{ timeRange: [number, number]; count: number; avgImportance: number }>;
  timestamp: number;
}

export interface ProgressiveResult {
  stages: CompactedMemory[];
  finalCount: number;
  totalCompression: number;
  totalStages: number;
}

export interface EWCTrainingResult {
  taskId: string;
  ewcLoss: number;
  forgetting: number;
  weightChange: number;
  performanceRetained: number;
}

export interface MemoryHyperparams {
  workingMemorySize: number;
  projectMemorySize: number;
  consolidationThreshold: number;
  evictionPolicy: string;
  ttlWorkingMs: number;
  ttlProjectMs: number;
  rehearsalIntervalMs: number;
  embeddingDim: number;
}

export interface AutoTuneReport {
  bestParams: Record<string, number>;
  bestScore: number;
  totalTrials: number;
  convergenceIteration: number;
  finalHitRate: number;
  finalLatency: number;
}

export interface TrainingExample {
  input: string[];
  label: string;
  weight?: number;
}

export interface FTRLParams {
  alpha: number;
  beta: number;
  lambda1: number;
  lambda2: number;
}

export interface PredictionResult {
  probability: number;
  label: string;
  confidence: number;
}

export interface ContinuousLearningConfig {
  ftrlParams: FTRLParams;
  ewcLambda: number;
  replayBufferSize: number;
  compactionSchedule: number[];
  metaOptimizationInterval: number;
}

export interface ReplayBufferEntry {
  input: string[];
  label: string;
  timestamp: number;
  weight: number;
}
