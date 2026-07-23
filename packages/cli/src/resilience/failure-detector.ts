import { OperationalFailure, FailureSummary } from './failure-types';

export interface FailureEvent {
  name: string;
  severity: string;
}

export function detectFailures(events: FailureEvent[]): {
  failures: OperationalFailure[];
  summary: FailureSummary;
} {
  const failures: OperationalFailure[] = events
    .filter(e => e.severity === 'error' || e.severity === 'critical')
    .map((event, index) => ({
      failureId: `failure-${index + 1}`,
      type: event.severity === 'critical' ? 'critical' as const : 'execution' as const,
      source: event.name,
      message: 'Operational failure detected.',
      severity: event.severity === 'critical' ? 'critical' as const : 'high' as const,
      occurredAt: new Date().toISOString(),
    }));

  const summary: FailureSummary = {
    total: failures.length,
    critical: failures.filter(f => f.severity === 'critical').length,
    byType: failures.reduce<Record<string, number>>((acc, f) => {
      acc[f.type] = (acc[f.type] ?? 0) + 1;
      return acc;
    }, {}),
  };

  return { failures, summary };
}
