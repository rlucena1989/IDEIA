import { describe, it, expect } from '@jest/globals';
import { consolidateSystem } from '../consolidation-engine';

describe('consolidation-engine', () => {
  it('consolidateSystem should be defined', () => {
    expect(consolidateSystem).toBeDefined();
  });

  it('should return healthy for clean signals', () => {
    const result = consolidateSystem({ telemetryCount: 10, alertCount: 0, failureCount: 0, policyViolationCount: 0, activeAgents: 5 });
    expect(result.healthStatus).toBe('healthy');
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it('should return degraded for moderate penalties', () => {
    const result = consolidateSystem({ telemetryCount: 10, alertCount: 3, failureCount: 2, policyViolationCount: 0, activeAgents: 3 });
    expect(result.healthStatus).toBe('degraded');
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThan(85);
  });

  it('should return critical for high penalties', () => {
    const result = consolidateSystem({ telemetryCount: 10, alertCount: 2, failureCount: 3, policyViolationCount: 1, activeAgents: 1 });
    expect(result.healthStatus).toBe('critical');
    expect(result.score).toBeLessThan(60);
  });

  it('should return blocked for severe penalties', () => {
    const result = consolidateSystem({ telemetryCount: 10, alertCount: 10, failureCount: 5, policyViolationCount: 3, activeAgents: 0 });
    expect(result.healthStatus).toBe('blocked');
    expect(result.score).toBeLessThan(30);
  });
});
