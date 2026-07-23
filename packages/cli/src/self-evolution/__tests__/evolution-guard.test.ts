import { describe, it, expect } from '@jest/globals';
import { validateEvolution } from '../evolution-guard';
import { buildReconfigurationPlan } from '../reconfiguration-plan';

describe('evolution-guard', () => {
  it('validateEvolution should be defined', () => {
    expect(validateEvolution).toBeDefined();
  });

  it('should allow plan with healthy score', () => {
    const plan = buildReconfigurationPlan([
      { changeId: 'c1', type: 'enable', target: 'x', reason: 'Test' },
    ]);
    const check = validateEvolution(plan, 85);
    expect(check.allowed).toBe(true);
  });

  it('should block plan with low health requiring approval', () => {
    const plan = buildReconfigurationPlan([
      { changeId: 'c1', type: 'migrate', target: 'db', reason: 'Migration' },
    ]);
    const check = validateEvolution(plan, 50);
    expect(check.allowed).toBe(false);
  });

  it('should block plan with no changes', () => {
    const plan = buildReconfigurationPlan([]);
    const check = validateEvolution(plan, 85);
    expect(check.allowed).toBe(false);
  });
});
