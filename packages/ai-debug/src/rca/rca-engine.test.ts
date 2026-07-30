import { RCAEngine } from './rca-engine';
import { ErrorNormalizer } from '../error-normalizer';
import { ErrorType as _ErrorType } from '../types';

describe('RCAEngine', () => {
  const engine = new RCAEngine();
  const normalizer = new ErrorNormalizer();

  it('should analyze TypeError with AST strategy', async () => {
    const error = await normalizer.normalize(new TypeError('Cannot read properties of undefined'));
    const rca = await engine.analyze(error);
    expect(rca).toBeDefined();
    expect(rca.confidence).toBeGreaterThan(0);
  });

  it('should match known patterns', async () => {
    const error = await normalizer.normalize(new Error('x is not defined'));
    const rca = await engine.analyze(error);
    expect(rca.description).toContain('undefined');
    expect(rca.confidence).toBeGreaterThan(0.5);
  });

  it('should handle unknown errors with low confidence', async () => {
    const error = await normalizer.normalize(new Error('Some obscure error 0xDEAD'));
    const rca = await engine.analyze(error);
    expect(rca).toBeDefined();
    expect(rca.confidence).toBeLessThanOrEqual(0.5);
  });

  it('should accept custom strategies', async () => {
    const customStrategy = {
      name: 'Custom',
      analyze: async () => ({ description: 'Custom analysis', confidence: 0.9, location: { file: 'test.ts', line: 1 }, strategy: 'custom' }),
    };
    engine.addStrategy(customStrategy);
    const error = await normalizer.normalize(new Error('test'));
    const rca = await engine.analyze(error);
    expect(rca).toBeDefined();
  });
});
