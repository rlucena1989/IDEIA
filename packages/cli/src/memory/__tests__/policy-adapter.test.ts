import { describe, it, expect } from '@jest/globals';
import { adaptPolicy } from '../policy-adapter';

describe('policy-adapter', () => {
  it('adaptPolicy should be defined', () => {
    expect(adaptPolicy).toBeDefined();
  });

  it('should approve with high confidence', () => {
    const adj = adaptPolicy('auto-repair', 'increase threshold', 0.9);
    expect(adj.approved).toBe(true);
  });

  it('should require review with low confidence', () => {
    const adj = adaptPolicy('auto-repair', 'increase threshold', 0.7);
    expect(adj.approved).toBe(false);
    expect(adj.reason).toContain('review');
  });
});
