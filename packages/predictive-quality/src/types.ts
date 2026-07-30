export interface Forecast {
  predictions: number[];
  confidence95: number[][];
  metadata?: Record<string, unknown>;
}

export interface ModelMetrics {
  mape: number;
  rmse: number;
  forecasts: number[];
}

export interface ChangepointResult {
  index: number;
  beforeMean: number;
  afterMean: number;
  magnitude: number;
  significant: boolean;
  pValue: number;
}

export interface ChangeSet {
  files: string[];
  authors: string[];
  isWeekend: boolean;
  nightCommit: boolean;
  docsOnly: boolean;
  testChanges: number;
  avgFileComplexity: number;
  hasDependencyChange: boolean;
  lastBuildSuccessRate: number;
  hour: number;
  hasNewDependency: boolean;
  isLargeRefactor: boolean;
}

export interface Prediction {
  probability: number;
  riskLevel: 'low' | 'medium' | 'high';
  topFactors: Array<{ feature: string; impact: number }>;
  recommendedAction: string;
}

export interface TrainingExample {
  changes: ChangeSet;
  buildFailed: boolean;
}

export interface TrainingMetrics {
  accuracy: number;
  mape?: number;
  rmse?: number;
  epochs?: number;
  featureImportance: Record<string, number>;
}

export interface TimePoint {
  date: number | string;
  value: number;
}

export interface ProphetResult {
  predictions: number[];
  confidence95: number[][];
  components: {
    trend: number;
    weekly: number[];
    daily: number[];
  };
}

export interface TrendModel {
  slope: number;
  intercept: number;
  stdError: number;
}

export interface CrossValidationResult {
  folds: FoldResult[];
  meanMAPE: number;
  meanRMSE: number;
  stdMAPE: number;
}

export interface FoldResult {
  fold: number;
  trainSize: number;
  testSize: number;
  mape: number;
  rmse: number;
}

export interface DatasetStats {
  total_samples: number;
  train_size: number;
  test_size: number;
  class_balance: { positive: number; negative: number };
  timespan: { start: string; end: string };
}

export interface DashboardData {
  forecasts: {
    arima: Forecast;
    prophet: ProphetResult;
    ensemble: Forecast;
  };
  changepoints: ChangepointResult[];
  risks: Prediction[];
  alerts: Alert[];
}

export interface Alert {
  type: 'changepoint' | 'build_risk';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface TimesNetConfig {
  sequenceLength: number;
  forecastHorizon: number;
  topKPeriods: number;
  hiddenDim: number;
  numBlocks: number;
  learningRate: number;
}

export interface CausalNode {
  id: string;
  name: string;
  parents: string[];
  type: 'metric' | 'intervention' | 'confounder' | 'mediator';
  values: number[];
}

export interface CausalGraph {
  nodes: Map<string, CausalNode>;
  edges: Array<{ from: string; to: string }>;
}

export interface CausalEffect {
  treatment: string;
  outcome: string;
  ate: number;
  confidence95: [number, number];
  pValue: number;
  backdoorSet: string[];
}
