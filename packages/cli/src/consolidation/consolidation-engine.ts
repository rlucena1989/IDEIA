import { SystemConsolidation } from './consolidation-types';

export function consolidateSystem(input: {
  telemetryCount: number;
  alertCount: number;
  failureCount: number;
  policyViolationCount: number;
  activeAgents: number;
}): SystemConsolidation {
  const penalty =
    input.alertCount * 5 +
    input.failureCount * 10 +
    input.policyViolationCount * 15;

  const score = Math.max(0, 100 - penalty);

  const healthStatus: SystemConsolidation['healthStatus'] =
    score >= 85 ? 'healthy' : score >= 60 ? 'degraded' : score >= 30 ? 'critical' : 'blocked';

  return {
    consolidationId: `consolidation-${Date.now()}`,
    createdAt: new Date().toISOString(),
    healthStatus,
    score,
    summary: 'System consolidation completed.',
    signals: {
      telemetry: input.telemetryCount,
      alerts: input.alertCount,
      failures: input.failureCount,
      policyViolations: input.policyViolationCount,
      activeAgents: input.activeAgents,
    },
    recommendations:
      healthStatus === 'healthy'
        ? ['Continue autonomous operation with supervision.']
        : ['Review critical signals before next cycle.'],
  };
}
