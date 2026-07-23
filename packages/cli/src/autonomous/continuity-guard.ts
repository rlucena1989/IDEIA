export interface ContinuityState {
  lastCycleCompletedAt?: string;
  consecutiveFailures: number;
  maxFailuresBeforeStop: number;
  stopped: boolean;
}

export function createContinuityGuard(maxFailures: number = 3): ContinuityState {
  return {
    consecutiveFailures: 0,
    maxFailuresBeforeStop: maxFailures,
    stopped: false,
  };
}

export function recordCycleResult(guard: ContinuityState, success: boolean): ContinuityState {
  return {
    ...guard,
    lastCycleCompletedAt: new Date().toISOString(),
    consecutiveFailures: success ? 0 : guard.consecutiveFailures + 1,
    stopped: !success && guard.consecutiveFailures + 1 >= guard.maxFailuresBeforeStop,
  };
}
