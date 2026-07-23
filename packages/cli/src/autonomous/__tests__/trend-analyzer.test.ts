import { describe, it, expect } from '@jest/globals';
import { analyzeTrend } from '../trend-analyzer';

describe('trend-analyzer', () => {
  it('analyzeTrend should be defined', () => {
    expect(analyzeTrend).toBeDefined();
  });

  it('should detect improving trend', () => {
    const t = analyzeTrend([70, 80, 90], 'performance');
    expect(t.direction).toBe('improving');
  });

  it('should detect degrading trend', () => {
    const t = analyzeTrend([90, 80, 70], 'performance');
    expect(t.direction).toBe('degrading');
  });

  it('should detect stable trend', () => {
    const t = analyzeTrend([80, 80, 80], 'performance');
    expect(t.direction).toBe('stable');
  });

  it('should have higher confidence with 3+ values', () => {
    const t1 = analyzeTrend([80, 85], 'perf');
    const t2 = analyzeTrend([80, 85, 90], 'perf');
    expect(t2.confidence).toBeGreaterThan(t1.confidence);
  });
});
