export interface RiskThresholds {
  thresholdId: string;
  low: number;
  moderate: number;
  high: number;
  critical: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  thresholdId: 'thresholds-default',
  low: 5,
  moderate: 10,
  high: 20,
  critical: Infinity,
};

export function evaluateRiskLevel(value: number, thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS): 'low' | 'moderate' | 'high' | 'critical' {
  if (value < thresholds.low) return 'low';
  if (value < thresholds.moderate) return 'moderate';
  if (value < thresholds.high) return 'high';
  return 'critical';
}
