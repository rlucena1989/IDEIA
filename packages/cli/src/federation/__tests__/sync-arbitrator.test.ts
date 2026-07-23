import { describe, it, expect } from '@jest/globals';
import { arbitrateSync } from '../sync-arbitrator';

describe('sync-arbitrator', () => {
  it('arbitrateSync should be defined', () => {
    expect(arbitrateSync).toBeDefined();
  });

  it('should prefer higher authority', () => {
    const d = arbitrateSync('1.0', '1.0', 2, 5);
    expect(d.approved).toBe(true);
    expect(d.winnerNodeId).toBe('remote');
  });

  it('should reject equal authority with diff versions', () => {
    const d = arbitrateSync('1.0', '2.0', 3, 3);
    expect(d.approved).toBe(false);
    expect(d.reason).toContain('manual review');
  });

  it('should approve equal authority with same version', () => {
    const d = arbitrateSync('1.0', '1.0', 3, 3);
    expect(d.approved).toBe(true);
  });
});
