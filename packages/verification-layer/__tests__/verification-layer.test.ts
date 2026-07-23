import { VerificationLayer } from '../src/verification-layer';
describe('VerificationLayer', () => {
  it('should register and run a suite', async () => {
    const vl = new VerificationLayer();
    vl.registerSuite({ name: 'quick', checks: [{ type: 'lint', name: 'lint-check', command: 'node -e "1+1"' }], parallel: false });
    const result = await vl.runSuite('quick');
    expect(result).not.toBeNull(); expect(result!.passed).toBe(1); expect(result!.score).toBe(100);
  });
  it('should return null for unknown suite', async () => {
    const vl = new VerificationLayer();
    expect(await vl.runSuite('unknown')).toBeNull();
  });
  it('should run all suites', async () => {
    const vl = new VerificationLayer();
    vl.registerSuite({ name: 'S1', checks: [{ type: 'lint', name: 'c1', command: 'node -e "1"' }], parallel: false });
    vl.registerSuite({ name: 'S2', checks: [{ type: 'test', name: 'c2', command: 'node -e "2"' }], parallel: false });
    const results = await vl.runAll();
    expect(results).toHaveLength(2);
  });
  it('should resolve environment variables', () => {
    const vl = new VerificationLayer();
    vl.setEnvironment('NODE_ENV', 'test'); vl.setEnvironment('API_KEY', 'required');
    const r1 = vl.resolveEnvironment({ NODE_ENV: 'test', API_KEY: 'secret' });
    expect(r1.missing).toHaveLength(0);
    const r2 = vl.resolveEnvironment({ NODE_ENV: 'test' });
    expect(r2.missing).toContain('API_KEY');
  });
  it('should handle check failures', async () => {
    const vl = new VerificationLayer();
    vl.registerSuite({ name: 'fail', checks: [{ type: 'build', name: 'fail-check', command: 'node -e "throw new Error(\'fail\')"' }], parallel: false });
    const result = await vl.runSuite('fail');
    expect(result!.failed).toBe(1); expect(result!.score).toBe(0);
  });
});
