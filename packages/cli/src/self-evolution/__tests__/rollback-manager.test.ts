import { describe, it, expect } from '@jest/globals';
import { rollbackEvolution } from '../rollback-manager';
import { buildReconfigurationPlan } from '../reconfiguration-plan';

describe('rollback-manager', () => {
  it('rollbackEvolution should be defined', () => {
    expect(rollbackEvolution).toBeDefined();
  });

  it('should rollback when available', () => {
    const plan = buildReconfigurationPlan([
      { changeId: 'c1', type: 'enable', target: 'x', reason: 'Test' },
    ]);
    const result = rollbackEvolution(plan);
    expect(result.rolledBack).toBe(true);
  });
});
