export interface EvolutionDecision {
  action: 'generate' | 'repair' | 'sync' | 'review' | 'block' | 'defer';
  rationale: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  requiresApproval: boolean;
}

export interface EvolutionDecisionContext {
  deltaSummary: {
    added: number;
    removed: number;
    changed: number;
    critical: number;
  };
  consistencyScore: number;
  hardeningScore: number;
  generationScore: number;
}
