import { ArtifactRegistry } from '../src/artifact-registry';

describe('ArtifactRegistry', () => {
  const registry = new ArtifactRegistry();

  it('registers artifacts with hash', () => {
    const artifact = registry.register('app.jar', '1.0.0', 'binary content', 'build-server', 'linux');
    expect(artifact.hash).toBeTruthy();
    expect(artifact.hashAlgorithm).toBe('sha256');
  });

  it('verifies integrity', () => {
    const artifact = registry.register('test.jar', '1.0', 'content', 'ci', 'docker');
    const ok = registry.verifyIntegrity(artifact.id, 'content');
    expect(ok.match).toBe(true);

    const fail = registry.verifyIntegrity(artifact.id, 'tampered');
    expect(fail.match).toBe(false);
  });

  it('finds by hash', () => {
    const a = registry.register('find-me', '1.0', 'unique content', 'me', 'env');
    const found = registry.findByHash(a.hash);
    expect(found.length).toBe(1);
  });
});
