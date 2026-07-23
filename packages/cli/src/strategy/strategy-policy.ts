export interface StrategyPolicy {
  maxRoadmapItems: number;
  minPriorityForAction: number;
  autoDeriveNextActions: boolean;
}

export const DEFAULT_STRATEGY_POLICY: StrategyPolicy = {
  maxRoadmapItems: 20,
  minPriorityForAction: 10,
  autoDeriveNextActions: true,
};
