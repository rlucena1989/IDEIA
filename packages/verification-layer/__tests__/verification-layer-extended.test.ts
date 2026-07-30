import { VerificationLayer, createVerificationLayer } from '../src/verification-layer';

describe('VerificationLayer', () => {
  describe('createVerificationLayer', () => {
    it('returns a new instance', () => {
      expect(createVerificationLayer()).toBeInstanceOf(VerificationLayer);
    });
  });

  describe('getSuites', () => {
    it('returns empty array initially', () => {
      const vl = new VerificationLayer();
      expect(vl.getSuites()).toEqual([]);
    });

    it('returns registered suites as a copy', () => {
      const vl = new VerificationLayer();
      vl.registerSuite({ name: 's1', checks: [], parallel: false });
      expect(vl.getSuites()).toHaveLength(1);
    });
  });

  describe('resolveEnvironment', () => {
    it('marks all as missing when env is empty', () => {
      const vl = new VerificationLayer();
      vl.setEnvironment('KEY1', 'required');
      vl.setEnvironment('KEY2', 'required');
      const result = vl.resolveEnvironment({});
      expect(result.filled).toHaveLength(0);
      expect(result.missing).toEqual(['KEY1', 'KEY2']);
    });

    it('marks all as filled when env has all keys', () => {
      const vl = new VerificationLayer();
      vl.setEnvironment('NODE_ENV', 'test');
      const result = vl.resolveEnvironment({ NODE_ENV: 'production' });
      expect(result.filled).toEqual(['NODE_ENV']);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe('runCheck', () => {
    it('handles missing command as immediate pass', async () => {
      const vl = new VerificationLayer();
      const result = await vl.runCheck({ type: 'lint', name: 'noop' });
      expect(result.passed).toBe(true);
      expect(result.duration).toBe(0);
    });
  });

  describe('runSuite with parallel', () => {
    it('runs checks in parallel', async () => {
      const vl = new VerificationLayer();
      vl.registerSuite({ name: 'parallel', checks: [
        { type: 'lint', name: 'c1', command: 'node -e "1"' },
        { type: 'test', name: 'c2', command: 'node -e "2"' },
      ], parallel: true });
      const result = await vl.runSuite('parallel');
      expect(result!.passed).toBe(2);
      expect(result!.score).toBe(100);
    });
  });
});
