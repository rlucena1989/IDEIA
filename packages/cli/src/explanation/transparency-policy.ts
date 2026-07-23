export interface TransparencyPolicy {
  policyId: string;
  explainCriticalDecisions: boolean;
  explainBlockedActions: boolean;
  explainRecommendations: boolean;
  includeEvidenceLinks: boolean;
}

export const DEFAULT_TRANSPARENCY_POLICY: TransparencyPolicy = {
  policyId: 'policy-transparency-default',
  explainCriticalDecisions: true,
  explainBlockedActions: true,
  explainRecommendations: true,
  includeEvidenceLinks: true,
};
