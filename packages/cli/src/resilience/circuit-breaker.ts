export interface CircuitBreakerState {
  name: string;
  failureCount: number;
  threshold: number;
  open: boolean;
  lastUpdatedAt: string;
}

export function createCircuitBreaker(name: string, threshold: number = 3): CircuitBreakerState {
  return {
    name,
    failureCount: 0,
    threshold,
    open: false,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function updateCircuitBreaker(state: CircuitBreakerState, failed: boolean): CircuitBreakerState {
  const failureCount = failed ? state.failureCount + 1 : 0;
  const open = failureCount >= state.threshold;

  return {
    ...state,
    failureCount,
    open,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function resetCircuitBreaker(state: CircuitBreakerState): CircuitBreakerState {
  return {
    ...state,
    failureCount: 0,
    open: false,
    lastUpdatedAt: new Date().toISOString(),
  };
}
