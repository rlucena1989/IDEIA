// ==========================================================================
// types.ts — Tipos do sistema de Detecção de Viés
// ==========================================================================

export type BiasStatus = 'pass' | 'warn' | 'fail';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type MetricName =
  | 'demographic_parity' | 'equal_opportunity' | 'equalized_odds'
  | 'disparate_impact' | 'statistical_parity_difference'
  | 'theil_index' | 'composite_score';

export interface BiasMetricResult {
  name: MetricName;
  displayName: string;
  value: number;
  threshold: number;
  passed: boolean;
  confidenceLower: number;
  confidenceUpper: number;
  pValue: number;
  interpretation: string;
  severity: Severity;
  recommendation: string;
}

export interface BiasInput {
  predictions: boolean[];
  groundTruth: boolean[];
  sensitiveAttributes: boolean[];
  groupLabels?: { privileged: string; unprivileged: string };
  metadata?: { modelName?: string; sessionId?: string; domain?: string };
}

export interface BiasReport {
  id: string;
  timestamp: string;
  metadata: {
    modelName: string;
    sessionId: string;
    domain: string;
    sampleSize: number;
    privilegedCount: number;
    unprivilegedCount: number;
  };
  metrics: BiasMetricResult[];
  overallStatus: BiasStatus;
  compositeScore: number;
  recommendations: string[];
  criticalViolations: string[];
  reportHash: string;
  previousHash?: string;
  detectorVersion: string;
}

export interface BiasThresholds {
  demographicParity: number;
  equalOpportunity: number;
  equalizedOdds: number;
  disparateImpactMin: number;
  statisticalParityDiff: number;
  theilIndex: number;
  compositeScore: number;
}

export interface BiasDetectorConfig {
  thresholds: BiasThresholds;
  minSampleSize: number;
  bootstrapIterations: number;
  confidenceLevel: number;
  ciActionOnFail: 'pass' | 'warn' | 'fail';
  domain: string;
  requiredMetrics: MetricName[];
  detectorVersion: string;
}

export const DEFAULT_THRESHOLDS: BiasThresholds = {
  demographicParity: 0.1,
  equalOpportunity: 0.1,
  equalizedOdds: 0.1,
  disparateImpactMin: 0.8,
  statisticalParityDiff: 0.1,
  theilIndex: 0.2,
  compositeScore: 0.3,
};

export const DEFAULT_CONFIG: BiasDetectorConfig = {
  thresholds: DEFAULT_THRESHOLDS,
  minSampleSize: 10,
  bootstrapIterations: 100,
  confidenceLevel: 0.95,
  ciActionOnFail: 'fail',
  domain: 'general',
  requiredMetrics: [],
  detectorVersion: '1.0.0',
};
