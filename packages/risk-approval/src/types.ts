export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalLevel = 'auto' | 'supervisor' | 'manager' | 'security';
export type ImpactLevel = 'minor' | 'moderate' | 'major' | 'severe';
export type ProbabilityLevel = 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain';

export interface RiskAssessment {
  level: RiskLevel;
  impact: ImpactLevel;
  impactScore: number;
  probability: ProbabilityLevel;
  probabilityScore: number;
  score: number;
  factors: string[];
  mitigation: string[];
}

export interface ApprovalRequirement {
  riskLevel: RiskLevel;
  requiredApprovals: ApprovalLevel[];
  autoApprove: boolean;
  requiresJustification: boolean;
  maxAutoTokens: number;
}

export interface ApprovalRequest {
  id: string;
  action: string;
  riskLevel: RiskLevel;
  justification?: string;
  requestedBy: string;
  approvals: Approval[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Approval {
  level: ApprovalLevel;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  reason?: string;
}

export const RISK_MATRIX: Record<ImpactLevel, Record<ProbabilityLevel, RiskLevel>> = {
  minor:     { rare: 'low', unlikely: 'low', possible: 'low', likely: 'medium', almost_certain: 'medium' },
  moderate:  { rare: 'low', unlikely: 'low', possible: 'medium', likely: 'medium', almost_certain: 'high' },
  major:     { rare: 'low', unlikely: 'medium', possible: 'high', likely: 'high', almost_certain: 'critical' },
  severe:    { rare: 'medium', unlikely: 'high', possible: 'critical', likely: 'critical', almost_certain: 'critical' },
};

export const IMPACT_SCORES: Record<ImpactLevel, number> = { minor: 1, moderate: 2, major: 3, severe: 4 };
export const PROBABILITY_SCORES: Record<ProbabilityLevel, number> = { rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5 };
