import { describe, it, expect } from '@jest/globals';
import { DEFAULT_STRATEGY_POLICY } from '../strategy-policy';

describe('strategy-policy', () => {
  it('should export DEFAULT_STRATEGY_POLICY', () => {
    expect(DEFAULT_STRATEGY_POLICY).toBeDefined();
  });

  it('should have maxRoadmapItems of 20', () => {
    expect(DEFAULT_STRATEGY_POLICY.maxRoadmapItems).toBe(20);
  });

  it('should have minPriorityForAction of 10', () => {
    expect(DEFAULT_STRATEGY_POLICY.minPriorityForAction).toBe(10);
  });

  it('should auto-derive next actions', () => {
    expect(DEFAULT_STRATEGY_POLICY.autoDeriveNextActions).toBe(true);
  });

  it('should create custom strategy policy', () => {
    const custom = {
      maxRoadmapItems: 50,
      minPriorityForAction: 20,
      autoDeriveNextActions: false,
    };
    expect(custom.maxRoadmapItems).toBe(50);
    expect(custom.autoDeriveNextActions).toBe(false);
  });
});
