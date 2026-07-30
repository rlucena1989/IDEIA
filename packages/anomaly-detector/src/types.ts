export interface AnomalyScore {
  timestamp: number;
  agentId: string;
  score: number;
  isAnomaly: boolean;
  threshold: number;
  componentScores: Record<string, number>;
}

export interface DetectionResult {
  detectorName: string;
  score: number;
  threshold: number;
  isAnomaly: boolean;
  details: Record<string, unknown>;
}

export interface AnomalyReport {
  agentId: string;
  timestamp: number;
  score: number;
  level: 'normal' | 'suspicious' | 'critical';
  factors: Array<{ name: string; score: number }>;
  recommendation: string;
  metadata: Record<string, unknown>;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  features: number[];
  label?: string;
}

export interface TimeSeriesWindow {
  points: TimeSeriesPoint[];
  startTime: number;
  endTime: number;
  statistics: {
    mean: number;
    std: number;
    min: number;
    max: number;
    count: number;
  };
}

export interface TransformerConfig {
  inputDim: number;
  dModel: number;
  nHeads: number;
  nLayers: number;
  dropout: number;
  maxSeqLen: number;
  learningRate: number;
}

export interface CausalAnomalyConfig {
  threshold: number;
  nSamples: number;
  alpha: number;
}

export interface ADWINConfig {
  delta: number;
  bucketSize: number;
}

export interface OnlineConfig {
  alpha: number;
  beta: number;
  lambda1: number;
  lambda2: number;
  windowSize: number;
  threshold: number;
}

export interface CausalGraphNode {
  id: string;
  type: 'action' | 'context' | 'metric';
  observed: boolean;
  parents: string[];
  cpt: Map<string, number>;
}

export interface CausalAnomalyResult {
  actionId: string;
  causalEffect: number;
  counterfactualRisk: number;
  isCausalAnomaly: boolean;
  confoundingFactors: string[];
  interventionPlan: string[];
}

export interface OnlineDetectionResult {
  timestamp: number;
  score: number;
  isAnomaly: boolean;
  currentThreshold: number;
  driftDetected: boolean;
  modelAge: number;
}

export interface TrajectoryData {
  actions: string[];
  contexts: Record<string, number>[];
  outcomes: Record<string, number>;
}
