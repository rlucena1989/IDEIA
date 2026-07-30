import { EcosystemPolicy, DEFAULT_ECOSYSTEM_POLICY } from '../ecosystem-policy';

describe('ecosystem-policy', () => {
  test('DEFAULT_ECOSYSTEM_POLICY has correct defaults', () => {
    expect(DEFAULT_ECOSYSTEM_POLICY.allowCrossDomainSync).toBe(true);
    expect(DEFAULT_ECOSYSTEM_POLICY.requireAuthorityForSecretAccess).toBe(true);
    expect(DEFAULT_ECOSYSTEM_POLICY.maxDomains).toBe(50);
  });

  test('can create custom policy', () => {
    const policy: EcosystemPolicy = {
      allowCrossDomainSync: false,
      requireAuthorityForSecretAccess: true,
      maxDomains: 10,
    };
    expect(policy.allowCrossDomainSync).toBe(false);
    expect(policy.maxDomains).toBe(10);
  });

  test('maxDomains accepts edge values', () => {
    const min: EcosystemPolicy = { ...DEFAULT_ECOSYSTEM_POLICY, maxDomains: 1 };
    const max: EcosystemPolicy = { ...DEFAULT_ECOSYSTEM_POLICY, maxDomains: 1000 };
    expect(min.maxDomains).toBe(1);
    expect(max.maxDomains).toBe(1000);
  });
});
