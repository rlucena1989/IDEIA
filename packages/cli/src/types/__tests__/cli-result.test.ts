import { success, failure } from '../cli-result';

describe('success', () => {
  it('returns ok=true with code 0 and message', () => {
    const result = success('done');
    expect(result.ok).toBe(true);
    expect(result.code).toBe(0);
    expect(result.message).toBe('done');
    expect(result.data).toBeUndefined();
  });

  it('includes data when provided', () => {
    const result = success('created', { id: 42 });
    expect(result.data).toEqual({ id: 42 });
  });

  it('preserves generic data type', () => {
    const result = success<string>('done', 'extra');
    expect(result.data).toBe('extra');
  });
});

describe('failure', () => {
  it('returns ok=false with default code 1', () => {
    const result = failure('error message');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toBe('error message');
    expect(result.error).toBeDefined();
    expect(result.error!.message).toBe('error message');
    expect(result.data).toBeUndefined();
  });

  it('accepts custom code and details', () => {
    const result = failure('not found', 404, { resource: 'user' });
    expect(result.code).toBe(404);
    expect(result.error!.details).toEqual({ resource: 'user' });
  });

  it('does not include data', () => {
    const result = failure('fail');
    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});
