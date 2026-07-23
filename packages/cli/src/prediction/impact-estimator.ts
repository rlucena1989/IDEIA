import { ImpactEstimate } from './prediction-types';

export function estimateImpact(target: string, affectedArea: string, score: number): ImpactEstimate {
  const severity: ImpactEstimate['severity'] =
    score < 3 ? 'low' : score < 6 ? 'medium' : score < 8 ? 'high' : 'critical';

  return {
    estimateId: `impact-${Date.now()}`,
    target,
    impactArea: affectedArea,
    severity,
    reasoning: `Estimated impact in ${affectedArea} based on score ${score}.`,
  };
}
