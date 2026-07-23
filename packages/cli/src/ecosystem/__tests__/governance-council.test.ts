import { describe, it, expect } from '@jest/globals';
import { decideGovernance } from '../governance-council';

describe('governance-council', () => {
  it('decideGovernance should be defined', () => {
    expect(decideGovernance).toBeDefined();
  });

  it('should approve with majority', () => {
    const d = decideGovernance('Enable feature X', [
      { member: 'a', approve: true },
      { member: 'b', approve: true },
      { member: 'c', approve: false },
    ]);
    expect(d.approved).toBe(true);
    expect(d.reason).toContain('Majority');
  });

  it('should reject without majority', () => {
    const d = decideGovernance('Disable module Y', [
      { member: 'a', approve: false },
      { member: 'b', approve: false },
      { member: 'c', approve: true },
    ]);
    expect(d.approved).toBe(false);
  });
});
