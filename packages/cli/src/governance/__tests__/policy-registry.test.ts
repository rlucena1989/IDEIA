import { describe, it, expect } from '@jest/globals';
import { PolicyRegistry } from '../policy-registry';
import { GovernancePolicy } from '../policy-types';

describe('policy-registry', () => {
  it('should register and list policies', () => {
    const r = new PolicyRegistry();
    const policy: GovernancePolicy = {
      policyId: 'p1', name: 'Test', description: '', enabled: true,
      appliesTo: ['state'], rules: [],
    };
    r.register(policy);
    expect(r.list().length).toBe(1);
  });

  it('should update existing policy on re-register', () => {
    const r = new PolicyRegistry();
    r.register({ policyId: 'p1', name: 'Old', description: '', enabled: true, appliesTo: [], rules: [] });
    r.register({ policyId: 'p1', name: 'New', description: '', enabled: true, appliesTo: [], rules: [] });
    expect(r.get('p1')?.name).toBe('New');
  });

  it('should remove policy', () => {
    const r = new PolicyRegistry();
    r.register({ policyId: 'p1', name: 'Test', description: '', enabled: true, appliesTo: [], rules: [] });
    expect(r.remove('p1')).toBe(true);
    expect(r.list().length).toBe(0);
  });

  it('should return false removing non-existent', () => {
    const r = new PolicyRegistry();
    expect(r.remove('nonexistent')).toBe(false);
  });
});
