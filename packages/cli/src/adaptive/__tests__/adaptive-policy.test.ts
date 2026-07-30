import { describe, it, expect } from '@jest/globals';
import { DEFAULT_ADAPTIVE_POLICY } from '../adaptive-policy';

describe('adaptive-policy', () => {
  it('should export DEFAULT_ADAPTIVE_POLICY', () => {
    expect(DEFAULT_ADAPTIVE_POLICY).toBeDefined();
  });

  it('should have maxCycleRepetitions of 3', () => {
    expect(DEFAULT_ADAPTIVE_POLICY.maxCycleRepetitions).toBe(3);
  });

  it('should have minConfidenceForAutoAction of 0.85', () => {
    expect(DEFAULT_ADAPTIVE_POLICY.minConfidenceForAutoAction).toBeCloseTo(0.85);
  });

  it('should have escalateOnCriticalCount of 2', () => {
    expect(DEFAULT_ADAPTIVE_POLICY.escalateOnCriticalCount).toBe(2);
  });

  it('should enable auto repair', () => {
    expect(DEFAULT_ADAPTIVE_POLICY.enableAutoRepair).toBe(true);
  });

  it('should create custom adaptive policy', () => {
    const custom = {
      maxCycleRepetitions: 5,
      minConfidenceForAutoAction: 0.95,
      escalateOnCriticalCount: 3,
      enableAutoRepair: false,
    };
    expect(custom.maxCycleRepetitions).toBe(5);
    expect(custom.enableAutoRepair).toBe(false);
  });
});
