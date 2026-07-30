import type { EvolutionRunResult } from '../execution-types';

describe('EvolutionRunResult type', () => {
  it('constructs a successful result', () => {
    const result: EvolutionRunResult = {
      ok: true,
      action: 'generate',
      rationale: 'Completed successfully',
      deltaSummary: { added: 3, removed: 1 },
      validation: { passed: true, notes: ['All checks passed'] },
      auditId: 'audit-001',
    };
    expect(result.ok).toBe(true);
    expect(result.validation.passed).toBe(true);
  });

  it('constructs a failed result', () => {
    const result: EvolutionRunResult = {
      ok: false,
      action: 'block',
      rationale: 'Policy violation',
      deltaSummary: {},
      validation: { passed: false, notes: ['Consistency check failed'] },
      auditId: 'audit-002',
    };
    expect(result.ok).toBe(false);
    expect(result.validation.notes).toHaveLength(1);
  });

  it('deltaSummary accepts any unknown value', () => {
    const result: EvolutionRunResult = {
      ok: true,
      action: 'sync',
      rationale: 'ok',
      deltaSummary: { nested: { count: 5 } },
      validation: { passed: true, notes: [] },
      auditId: 'a3',
    };
    expect((result.deltaSummary as any).nested.count).toBe(5);
  });
});
