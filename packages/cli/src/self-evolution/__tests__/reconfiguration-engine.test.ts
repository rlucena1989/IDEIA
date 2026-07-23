import { describe, it, expect } from '@jest/globals';
import { buildReconfigurationPlan } from '../reconfiguration-plan';
import { applyReconfiguration } from '../reconfiguration-engine';

describe('reconfiguration-engine', () => {
  it('applyReconfiguration should be defined', () => {
    expect(applyReconfiguration).toBeDefined();
  });

  it('should apply plan and return result', () => {
    const plan = buildReconfigurationPlan([
      { changeId: 'c1', type: 'enable', target: 'feature-x', reason: 'Test' },
    ]);
    const result = applyReconfiguration(plan);
    expect(result.applied).toBe(true);
    expect(result.planId).toBe(plan.planId);
    expect(result.notes.length).toBe(1);
  });
});
