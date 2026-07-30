import { ErrorNormalizer } from './error-normalizer';
import { ErrorType, ErrorSource } from './types';

describe('ErrorNormalizer', () => {
  const normalizer = new ErrorNormalizer();

  it('should classify TypeError correctly', async () => {
    const error = new TypeError('Cannot read properties of undefined');
    const result = await normalizer.normalize(error);
    expect(result.type).toBe(ErrorType.TypeError);
  });

  it('should classify ReferenceError correctly', async () => {
    const error = new ReferenceError('x is not defined');
    const result = await normalizer.normalize(error);
    expect(result.type).toBe(ErrorType.ReferenceError);
  });

  it('should classify test assertion errors', async () => {
    const error = new Error('assertion failed: expected 5, got 3');
    const result = await normalizer.normalize(error);
    expect(result.type).toBe(ErrorType.AssertionError);
    expect(result.source).toBe(ErrorSource.Test);
  });

  it('should parse stack traces', async () => {
    const error = new Error('test');
    const result = await normalizer.normalize(error);
    expect(result.stack).toBeDefined();
    expect(Array.isArray(result.stack)).toBe(true);
  });

  it('should set frequency and timestamps', async () => {
    const error = new Error('generic error');
    const result = await normalizer.normalize(error);
    expect(result.frequency).toBe(1);
    expect(result.firstSeen).toBeInstanceOf(Date);
    expect(result.lastSeen).toBeInstanceOf(Date);
  });
});
