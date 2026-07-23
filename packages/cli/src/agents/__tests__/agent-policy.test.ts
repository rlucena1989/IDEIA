import { describe, it, expect } from '@jest/globals';
import { DEFAULT_AGENT_POLICY } from '../agent-policy';

describe('agent-policy', () => {
  it('DEFAULT_AGENT_POLICY should be defined', () => {
    expect(DEFAULT_AGENT_POLICY).toBeDefined();
  });

  it('should have maxTasksPerAgent of 3', () => {
    expect(DEFAULT_AGENT_POLICY.maxTasksPerAgent).toBe(3);
  });

  it('should not allow blocked agents', () => {
    expect(DEFAULT_AGENT_POLICY.allowBlockedAgents).toBe(false);
  });
});
