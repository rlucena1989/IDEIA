import { describe, it, expect } from '@jest/globals';
import { DEFAULT_GOVERNANCE_POLICY } from '../governance-policy';

describe('governance-policy', () => {
  it('should export DEFAULT_GOVERNANCE_POLICY with correct id', () => {
    expect(DEFAULT_GOVERNANCE_POLICY.policyId).toBe('policy-default-governance');
  });

  it('should be enabled', () => {
    expect(DEFAULT_GOVERNANCE_POLICY.enabled).toBe(true);
  });

  it('should have 3 rules', () => {
    expect(DEFAULT_GOVERNANCE_POLICY.rules).toHaveLength(3);
  });

  it('should apply to all 7 domains', () => {
    expect(DEFAULT_GOVERNANCE_POLICY.appliesTo).toHaveLength(7);
    expect(DEFAULT_GOVERNANCE_POLICY.appliesTo).toContain('state');
    expect(DEFAULT_GOVERNANCE_POLICY.appliesTo).toContain('evolution');
  });

  it('should have a rule blocking unaudited publish', () => {
    const publishRule = DEFAULT_GOVERNANCE_POLICY.rules.find(r => r.action === 'publish');
    expect(publishRule).toBeDefined();
    expect(publishRule!.allow).toBe(false);
    expect(publishRule!.requiresApproval).toBe(true);
  });

  it('should have generate rule requiring approval for high risk', () => {
    const genRule = DEFAULT_GOVERNANCE_POLICY.rules.find(r => r.ruleId === 'rule-block-critical-generation');
    expect(genRule).toBeDefined();
    expect(genRule!.requiresApproval).toBe(true);
    expect(genRule!.minRisk).toBe('high');
  });

  it('should have sync rule requiring approval for high risk', () => {
    const syncRule = DEFAULT_GOVERNANCE_POLICY.rules.find(r => r.ruleId === 'rule-block-forced-sync-critical');
    expect(syncRule).toBeDefined();
    expect(syncRule!.requiresApproval).toBe(true);
    expect(syncRule!.minRisk).toBe('high');
  });
});
