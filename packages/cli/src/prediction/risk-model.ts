export interface RiskAssessment {
  riskId: string;
  subject: string;
  likelihood: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  reason: string;
}

function scoreToLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  return score < 3 ? 'low' : score < 6 ? 'medium' : score < 8 ? 'high' : 'critical';
}

export function assessRisk(subject: string, likelihoodScore: number, impactScore: number): RiskAssessment {
  const score = likelihoodScore * impactScore;

  return {
    riskId: `risk-${Date.now()}`,
    subject,
    likelihood: scoreToLevel(likelihoodScore),
    impact: scoreToLevel(impactScore),
    score,
    reason: 'Risk assessed from likelihood and impact scores.',
  };
}
