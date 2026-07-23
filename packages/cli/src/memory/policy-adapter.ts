export interface PolicyAdjustment {
  adjustmentId: string;
  policyName: string;
  change: string;
  approved: boolean;
  reason: string;
}

export function adaptPolicy(policyName: string, change: string, confidence: number): PolicyAdjustment {
  return {
    adjustmentId: `adjust-${Date.now()}`,
    policyName,
    change,
    approved: confidence >= 0.85,
    reason: confidence >= 0.85 ? 'High-confidence adaptation.' : 'Requires review before adoption.',
  };
}
