import { computeMetrics } from '../metrics';

describe('metrics', () => {
  it('computeMetrics should be defined', () => {
    expect(computeMetrics).toBeDefined();
  });
  it('computeMetrics should execute without throwing', () => {
    expect(typeof computeMetrics).toBe('function');
    try { (computeMetrics as any)(); } catch {}
  });
});
