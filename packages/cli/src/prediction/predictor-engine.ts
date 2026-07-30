import { PredictionInput, PredictionResult } from './prediction-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('predictor-engine');

export function predictRisk(input: PredictionInput): PredictionResult {
  const latestDrift = input.driftScore[input.driftScore.length - 1] ?? 0;
  const latestAlerts = input.alertCount[input.alertCount.length - 1] ?? 0;
  const latestFailures = input.failureCount[input.failureCount.length - 1] ?? 0;

  const riskValue = latestDrift + latestAlerts * 2 + latestFailures * 3;

  const riskLevel: PredictionResult['riskLevel'] =
    riskValue < 5 ? 'low' :
    riskValue < 10 ? 'moderate' :
    riskValue < 20 ? 'high' : 'critical';

  return {
    predictionId: `prediction-${Date.now()}`,
    target: input.target,
    riskLevel,
    confidence: Math.min(1, 0.6 + input.historyScore.length * 0.05),
    summary: `Predicted risk for ${input.target} is ${riskLevel}.`,
    createdAt: new Date().toISOString(),
  };
}
