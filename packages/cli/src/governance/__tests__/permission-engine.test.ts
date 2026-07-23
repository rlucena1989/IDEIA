import { describe, it, expect } from '@jest/globals';
import { evaluatePermission } from '../permission-engine';
import { GovernancePolicy } from '../policy-types';

describe('permission-engine', () => {
  const policy: GovernancePolicy = {
    policyId: 'p1', name: 'Test', description: '', enabled: true,
    appliesTo: ['generation'],
    rules: [
      { ruleId: 'r1', action: 'generate', allow: true, requiresApproval: true, minRisk: 'high' },
      { ruleId: 'r2', action: 'publish', allow: false, requiresApproval: true, minRisk: 'medium' },
    ],
  };

  it('evaluatePermission should be defined', () => {
    expect(evaluatePermission).toBeDefined();
  });

  it('should allow action with no matching rule', () => {
    const result = evaluatePermission({ action: 'sync', contextId: 'default', risk: 'low' }, [policy]);
    expect(result.allowed).toBe(true);
  });

  it('should match rule and return allowed', () => {
    const result = evaluatePermission({ action: 'generate', contextId: 'default', risk: 'high' }, [policy]);
    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.policyId).toBe('p1');
  });

  it('should deny blocked action', () => {
    const result = evaluatePermission({ action: 'publish', contextId: 'default', risk: 'medium' }, [policy]);
    expect(result.allowed).toBe(false);
  });

  it('should skip disabled policies', () => {
    const disabled = { ...policy, enabled: false };
    const result = evaluatePermission({ action: 'generate', contextId: 'default', risk: 'high' }, [disabled]);
    expect(result.allowed).toBe(true);
    expect(result.policyId).toBeUndefined();
  });
});
