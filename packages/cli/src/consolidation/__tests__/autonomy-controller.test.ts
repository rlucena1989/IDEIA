import { describe, it, expect } from '@jest/globals';
import { resolveAutonomy } from '../autonomy-controller';
import { FinalVerdict } from '../consolidation-types';

describe('autonomy-controller', () => {
  it('resolveAutonomy should be defined', () => {
    expect(resolveAutonomy).toBeDefined();
  });

  it('should disable autonomy when verdict blocks', () => {
    const verdict: FinalVerdict = { verdictId: 'v1', decidedAt: '', status: 'blocked', reason: 'Blocked', allowAutonomy: false };
    const a = resolveAutonomy(verdict);
    expect(a.enabled).toBe(false);
    expect(a.level).toBe('none');
  });

  it('should grant assisted autonomy when allowed', () => {
    const verdict: FinalVerdict = { verdictId: 'v2', decidedAt: '', status: 'ready-for-autonomy', reason: 'Ready', allowAutonomy: true };
    const a = resolveAutonomy(verdict);
    expect(a.enabled).toBe(true);
    expect(a.level).toBe('assisted');
  });
});
