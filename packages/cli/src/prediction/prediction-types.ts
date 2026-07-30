import * as _crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('prediction-types');

export interface PredictionInput {
  target: string;
  historyScore: number[];
  driftScore: number[];
  alertCount: number[];
  failureCount: number[];
}

export interface PredictionResult {
  predictionId: string;
  target: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number;
  summary: string;
  createdAt: string;
}

export interface ImpactEstimate {
  estimateId: string;
  target: string;
  impactArea: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
}

export function createPredictionInput(params: {
  target: string;
  historyScore?: number[];
  driftScore?: number[];
  alertCount?: number[];
  failureCount?: number[];
}): PredictionInput {
  return {
    target: params.target,
    historyScore: params.historyScore ?? [],
    driftScore: params.driftScore ?? [],
    alertCount: params.alertCount ?? [],
    failureCount: params.failureCount ?? [],
  };
}
