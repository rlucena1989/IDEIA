import { describe, it, expect } from '@jest/globals';
import { startCycle, endCycle } from '../cycle-controller';

describe('cycle-controller', () => {
  it('startCycle should return running cycle', () => {
    const c = startCycle();
    expect(c.status).toBe('running');
    expect(c.startedAt).toBeDefined();
    expect(c.cycleId).toBeDefined();
  });

  it('endCycle should close cycle with status', () => {
    const c = startCycle();
    const ended = endCycle(c, 'completed', 'All good');
    expect(ended.endedAt).toBeDefined();
    expect(ended.status).toBe('completed');
    expect(ended.notes).toContain('All good');
  });
});
