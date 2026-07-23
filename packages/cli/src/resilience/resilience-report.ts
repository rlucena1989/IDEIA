import { OperationalFailure, FailureSummary } from './failure-types';
import { FallbackAction } from './fallback-policy';
import { RecoveryPlan } from './recovery-plan';
import { RecoveryResult } from './recovery-engine';
import { CircuitBreakerState } from './circuit-breaker';

export interface ResilienceReport {
  generatedAt: string;
  failures: OperationalFailure[];
  summary: FailureSummary;
  fallbacks: FallbackAction[];
  plans: RecoveryPlan[];
  recoveries: RecoveryResult[];
  breakers: CircuitBreakerState[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
}

export function buildResilienceReport(params: {
  failures: OperationalFailure[];
  summary: FailureSummary;
  fallbacks: FallbackAction[];
  plans: RecoveryPlan[];
  recoveries: RecoveryResult[];
  breakers: CircuitBreakerState[];
}): ResilienceReport {
  const openBreakers = params.breakers.filter(b => b.open).length;
  const criticalFailures = params.summary.critical;

  let overallStatus: ResilienceReport['overallStatus'] = 'healthy';
  if (criticalFailures > 0) overallStatus = 'critical';
  else if (openBreakers > 0 || params.failures.length > 0) overallStatus = 'degraded';

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    overallStatus,
  };
}
