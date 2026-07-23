import { PredictionResult, ImpactEstimate } from './prediction-types';
import { RiskAssessment } from './risk-model';

export interface PredictionReport {
  generatedAt: string;
  predictions: PredictionResult[];
  risks: RiskAssessment[];
  impacts: ImpactEstimate[];
  notes: string[];
}

export function buildPredictionReport(params: {
  predictions: PredictionResult[];
  risks: RiskAssessment[];
  impacts: ImpactEstimate[];
}): PredictionReport {
  const notes: string[] = [
    `${params.predictions.length} prediction(s)`,
    `${params.risks.length} risk assessment(s)`,
    `${params.impacts.length} impact estimate(s)`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    notes,
  };
}
