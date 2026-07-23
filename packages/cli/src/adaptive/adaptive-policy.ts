export interface AdaptivePolicy {
  maxCycleRepetitions: number;
  minConfidenceForAutoAction: number;
  escalateOnCriticalCount: number;
  enableAutoRepair: boolean;
}

export const DEFAULT_ADAPTIVE_POLICY: AdaptivePolicy = {
  maxCycleRepetitions: 3,
  minConfidenceForAutoAction: 0.85,
  escalateOnCriticalCount: 2,
  enableAutoRepair: true,
};
