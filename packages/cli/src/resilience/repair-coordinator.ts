import { OperationalFailure } from './failure-types';
import { resolveFallback, FallbackAction } from './fallback-policy';
import { buildRecoveryPlan, RecoveryPlan } from './recovery-plan';
import { executeRecovery, RecoveryResult } from './recovery-engine';
import { CircuitBreakerState, updateCircuitBreaker } from './circuit-breaker';

export interface RepairCoordinationResult {
  failure: OperationalFailure;
  fallback: FallbackAction;
  plan: RecoveryPlan;
  recovery: RecoveryResult;
  breaker: CircuitBreakerState;
  summary: string;
}

export function coordinateRepair(
  failure: OperationalFailure,
  breaker: CircuitBreakerState
): RepairCoordinationResult {
  const fallback = resolveFallback(failure);
  const plan = buildRecoveryPlan(failure);
  const recovery = executeRecovery(plan);
  const updatedBreaker = updateCircuitBreaker(breaker, !recovery.ok);

  return {
    failure,
    fallback,
    plan,
    recovery,
    breaker: updatedBreaker,
    summary: [
      `Type: ${failure.type}`,
      `Fallback: ${fallback.action}`,
      `Recovery: ${recovery.ok ? 'OK' : 'Failed'}`,
      `Breaker: ${updatedBreaker.open ? 'OPEN' : 'CLOSED'}`,
    ].join(' | '),
  };
}
