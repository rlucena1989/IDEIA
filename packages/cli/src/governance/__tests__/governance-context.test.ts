import { describe, it, expect } from '@jest/globals';
import { buildGovernanceContext } from '../governance-context';

describe('governance-context', () => {
  it('should create context with defaults', () => {
    const ctx = buildGovernanceContext({ contextId: 'ctx-1' });
    expect(ctx.contextId).toBe('ctx-1');
    expect(ctx.risk).toBe('low');
    expect(ctx.allowAutoActions).toBe(true);
    expect(ctx.requireApproval).toBe(false);
    expect(ctx.policies).toEqual([]);
  });

  it('should create context with custom risk', () => {
    const ctx = buildGovernanceContext({ contextId: 'ctx-2', risk: 'critical' });
    expect(ctx.risk).toBe('critical');
  });

  it('should accept allowAutoActions override', () => {
    const ctx = buildGovernanceContext({ contextId: 'ctx-3', allowAutoActions: false });
    expect(ctx.allowAutoActions).toBe(false);
  });

  it('should accept requireApproval override', () => {
    const ctx = buildGovernanceContext({ contextId: 'ctx-4', requireApproval: true });
    expect(ctx.requireApproval).toBe(true);
  });

  it('should accept policies list', () => {
    const ctx = buildGovernanceContext({ contextId: 'ctx-5', policies: ['policy-a', 'policy-b'] });
    expect(ctx.policies).toEqual(['policy-a', 'policy-b']);
  });

  it('should set medium risk for medium input', () => {
    const ctx = buildGovernanceContext({ contextId: 'ctx-6', risk: 'medium' });
    expect(ctx.risk).toBe('medium');
  });
});
