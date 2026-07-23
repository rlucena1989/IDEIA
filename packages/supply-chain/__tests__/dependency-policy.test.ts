import { DependencyPolicyManager } from '../src/dependency-policy';

describe('DependencyPolicyManager', () => {
  const mgr = new DependencyPolicyManager();
  mgr.setPolicy('lodash', { name: 'lodash', allowedVersions: ['4.17.21'], blocked: false, requireAudit: false, maxAgeDays: 365 });
  mgr.setPolicy('bad-dep', { name: 'bad-dep', allowedVersions: [], blocked: true, requireAudit: false, maxAgeDays: 0 });

  it('allows compliant dependencies', () => {
    const result = mgr.check('lodash', '4.17.21', 30);
    expect(result.allowed).toBe(true);
  });

  it('blocks blacklisted dependencies', () => {
    const result = mgr.check('bad-dep', '1.0.0', 0);
    expect(result.allowed).toBe(false);
  });

  it('rejects non-allowed versions', () => {
    const result = mgr.check('lodash', '4.17.20', 30);
    expect(result.allowed).toBe(false);
  });

  it('returns all policies', () => {
    const all = mgr.getAllPolicies();
    expect(all.length).toBe(2);
  });
});
