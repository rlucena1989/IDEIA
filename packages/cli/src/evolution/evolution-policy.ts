export interface EvolutionPolicy {
  minConsistencyScore: number;
  minHardeningScore: number;
  minGenerationScore: number;
  blockOnCriticalDelta: boolean;
  requireApprovalOnRepair: boolean;
}

export const DEFAULT_EVOLUTION_POLICY: EvolutionPolicy = {
  minConsistencyScore: 70,
  minHardeningScore: 70,
  minGenerationScore: 70,
  blockOnCriticalDelta: true,
  requireApprovalOnRepair: true,
};
