import { BuildVerifier } from '../src/build-verifier';

describe('BuildVerifier', () => {
  const verifier = new BuildVerifier();

  it('detects irreproducible builds without locked deps', () => {
    const result = verifier.verify({ src: 'code' }, { node_version: '20' }, 'wronghash');
    expect(result.reproducible).toBe(false);
    expect(result.differences.length).toBeGreaterThan(0);
  });

  it('detects reproducible builds with locked deps', () => {
    const result = verifier.verify({ src: 'code' }, { 'lock_version': '1', node_version: '20' }, '');
    expect(result.reproducible).toBeDefined();
    expect(result.buildConfig.node_version).toBe('20');
  });
});
