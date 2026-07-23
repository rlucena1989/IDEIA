export interface SelfEvolutionPolicy {
  minHealthScoreForChange: number;
  requireApprovalForEnable: boolean;
  requireApprovalForDisable: boolean;
  enableRollback: boolean;
}

export const DEFAULT_SELF_EVOLUTION_POLICY: SelfEvolutionPolicy = {
  minHealthScoreForChange: 60,
  requireApprovalForEnable: false,
  requireApprovalForDisable: true,
  enableRollback: true,
};
