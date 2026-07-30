import { success, failure } from '../src/types';

describe('cli types', () => {
  test('success returns ok result with message', () => {
    const result = success('Operation completed');
    expect(result.ok).toBe(true);
    expect(result.code).toBe(0);
    expect(result.message).toBe('Operation completed');
  });

  test('success includes optional data', () => {
    const data = { id: 1, name: 'test' };
    const result = success('Created', data);
    expect(result.data).toEqual(data);
  });

  test('failure returns error result with default code', () => {
    const result = failure('Something went wrong');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toBe('Something went wrong');
    expect(result.error).toBeDefined();
    expect(result.error!.message).toBe('Something went wrong');
  });

  test('failure accepts custom code and details', () => {
    const result = failure('Not found', 404, { resource: 'user' });
    expect(result.code).toBe(404);
    expect(result.error!.details).toEqual({ resource: 'user' });
  });

  test('failure does not include data', () => {
    const result = failure('Error');
    expect(result.data).toBeUndefined();
  });
});
