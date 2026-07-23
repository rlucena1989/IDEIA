import { describe, it, expect } from '@jest/globals';
import { executeRecovery } from '../recovery-engine';
import { buildRecoveryPlan } from '../recovery-plan';
import { OperationalFailure } from '../failure-types';

describe('recovery-engine', () => {
  it('executeRecovery should be defined', () => {
    expect(executeRecovery).toBeDefined();
  });

  it('should execute plan successfully for non-critical failure', () => {
    const failure: OperationalFailure = {
      failureId: 'f1', type: 'integrity', source: 'test', message: 'Checksum mismatch',
      severity: 'high', occurredAt: new Date().toISOString(),
    };
    const plan = buildRecoveryPlan(failure);
    const result = executeRecovery(plan);
    expect(result.ok).toBe(true);
    expect(result.appliedSteps.length).toBeGreaterThan(0);
  });

  it('should require escalation for critical failures', () => {
    const failure: OperationalFailure = {
      failureId: 'f2', type: 'critical', source: 'test', message: 'Critical error',
      severity: 'critical', occurredAt: new Date().toISOString(),
    };
    const plan = buildRecoveryPlan(failure);
    const result = executeRecovery(plan);
    expect(result.ok).toBe(false);
    expect(result.notes.some(n => n.includes('Escalation'))).toBe(true);
  });
});
