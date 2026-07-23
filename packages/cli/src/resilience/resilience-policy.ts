export interface ResiliencePolicy {
  maxRetries: number;
  circuitBreakerThreshold: number;
  allowAutoRepair: boolean;
  requireApprovalForCritical: boolean;
}

export const DEFAULT_RESILIENCE_POLICY: ResiliencePolicy = {
  maxRetries: 3,
  circuitBreakerThreshold: 3,
  allowAutoRepair: true,
  requireApprovalForCritical: true,
};
