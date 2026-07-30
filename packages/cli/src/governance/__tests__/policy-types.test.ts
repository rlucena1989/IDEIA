import { describe, it, expect } from '@jest/globals';
import { GovernancePolicy, GovernanceRule } from '../policy-types';

describe('policy-types', () => {
  it('should create a valid GovernancePolicy', () => {
    const policy: GovernancePolicy = {
      policyId: 'p1',
      name: 'Test Policy',
      description: 'A test',
      enabled: true,
      appliesTo: ['state', 'generation'],
      rules: [],
    };
    expect(policy.policyId).toBe('p1');
    expect(policy.enabled).toBe(true);
    expect(policy.appliesTo).toContain('state');
  });

  it('should create a valid GovernanceRule', () => {
    const rule: GovernanceRule = {
      ruleId: 'r1',
      action: 'generate',
      allow: true,
      requiresApproval: false,
    };
    expect(rule.ruleId).toBe('r1');
    expect(rule.allow).toBe(true);
  });

  it('should support optional minRisk and contexts', () => {
    const rule: GovernanceRule = {
      ruleId: 'r2',
      action: 'publish',
      allow: false,
      requiresApproval: true,
      minRisk: 'high',
      contexts: ['production'],
    };
    expect(rule.minRisk).toBe('high');
    expect(rule.contexts).toEqual(['production']);
  });

  it('should allow all appliesTo values', () => {
    const allValues: GovernancePolicy['appliesTo'] = [
      'state', 'generation', 'hardening', 'distribution', 'telemetry', 'resilience', 'evolution',
    ];
    const policy: GovernancePolicy = {
      policyId: 'p2', name: 'Full', description: '', enabled: false,
      appliesTo: allValues, rules: [],
    };
    expect(policy.appliesTo).toHaveLength(7);
  });

  it('should accept disabled policy', () => {
    const policy: GovernancePolicy = {
      policyId: 'p3', name: 'Disabled', description: '', enabled: false,
      appliesTo: [], rules: [],
    };
    expect(policy.enabled).toBe(false);
  });
});
