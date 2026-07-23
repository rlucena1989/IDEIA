import { createSupplyChainManager } from '../src/index';

describe('SupplyChainManager (integration)', () => {
  const mgr = createSupplyChainManager();

  it('registers and verifies artifacts', () => {
    const a = mgr.registerArtifact('app', '1.0', 'content', 'ci', 'docker');
    const check = mgr.verify(a.id, 'content');
    expect(check.match).toBe(true);
  });

  it('checks dependencies', () => {
    mgr.dependencyPolicy.setPolicy('react', { name: 'react', allowedVersions: ['18.2.0'], blocked: false, requireAudit: false, maxAgeDays: 365 });
    const result = mgr.checkDependency('react', '18.2.0', 30);
    expect(result.allowed).toBe(true);
  });

  it('verifies builds', () => {
    const result = mgr.verifyBuild({ src: 'code' }, { 'lock_version': '1' }, 'hash');
    expect(result.reproducible).toBeDefined();
  });
});
