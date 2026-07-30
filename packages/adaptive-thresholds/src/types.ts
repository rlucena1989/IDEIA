export interface EngineConfig {
  modelType: 'gradient_boosting' | 'bayesian' | 'ensemble';
  calibrationEnabled: boolean;
  driftCheckInterval: number;
  minDataPoints: number;
  ensembleWeights: { gb: number; bayesian: number };
}

export interface ChangeContext {
  changeType: 'hotfix' | 'bugfix' | 'feature' | 'refactor' | 'docs' | 'config';
  projectAge: number;
  teamSize: number;
  authorExperience: number;
  branchType: 'main' | 'develop' | 'feature' | 'hotfix';
  filesChanged: number;
  dependenciesChanged: number;
  historicalMetrics: MetricSnapshot[];
}

export interface MetricSnapshot {
  coverage: number;
  mutationScore: number;
  complexity: number;
  duplications: number;
  maintainability: number;
  testCount: number;
}

export interface ThresholdResult {
  metric: string;
  baseValue: number;
  adjustedValue: number;
  delta: number;
  confidence: number;
  contributingFactors: Array<{ name: string; impact: number }>;
}

export interface DriftSignal {
  type: 'data_drift' | 'concept_drift' | 'performance_drift';
  metric: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
  pValue: number;
  recommendation: string;
}

export interface ModelPrediction {
  adjustment: number;
  confidence: number;
  factors: Array<{ name: string; impact: number }>;
}

export interface EngineStatus {
  modelType: string;
  dataPoints: number;
  driftAlerts: DriftSignal[];
  lastTraining: Date | null;
}

export interface OnlineLearnerConfig {
  learningRate: number;
  alpha: number;
  beta: number;
  l1Regularization: number;
  l2Regularization: number;
  adaptivity: 'constant' | 'decreasing' | 'adagrad' | 'ftrl';
}

export interface RegretMetrics {
  loss: number;
  regret: number;
  cumulativeRegret: number;
  avgRegret: number;
  weightNorm: number;
  updateCount: number;
}

export interface OnlineMetrics {
  accuracy: number;
  cumulativeRegret: number;
  avgRegret: number;
  weightCount: number;
  activeFeatures: Array<{ index: number; weight: number }>;
  convergenceRate: number;
}

export interface MAMLConfig {
  innerLR: number;
  outerLR: number;
  innerSteps: number;
  nSupport: number;
  nQuery: number;
  metaBatchSize: number;
}

export interface ThresholdTask {
  metricName: string;
  supportFeatures: number[][];
  supportLabels: number[];
  queryFeatures: number[][];
  queryLabels: number[];
}

export interface MetaTrainingMetrics {
  finalLoss: number;
  finalAccuracy: number;
  epochs: number;
  tasksPerEpoch: number;
  convergenceSteps: number;
}

export interface MetaMetrics {
  nTasks: number;
  uniqueMetrics: number;
  adaptedMetrics: number;
  metaWeightNorm: number;
}

export interface SHAPExplanation {
  metricName: string;
  baseThreshold: number;
  adjustedThreshold: number;
  featureContributions: Array<{ name: string; value: number; shapValue: number; direction: 'up' | 'down' | 'none' }>;
  expectedValue: number;
  interactionEffects: Array<{ featureA: string; featureB: string; interactionValue: number }>;
  confidence: number;
  topFactors: string[];
}

export interface GateEvaluation {
  metric: string;
  threshold: number;
  actual: number;
  passed: boolean;
  confidence: number;
  factors: Array<{ name: string; impact: number }>;
}
