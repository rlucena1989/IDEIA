import { resetIO } from '../../io';

const ORIGINAL_TEST_MODE = process.env.GTI_TEST_MODE;

describe('ConfigUseCase', () => {
  let ConfigUseCase: typeof import('../config-use-case').ConfigUseCase;
  let useCase: import('../config-use-case').ConfigUseCase;

  beforeAll(() => {
    process.env.GTI_TEST_MODE = '1';
    resetIO();
    ConfigUseCase = jest.requireActual('../config-use-case').ConfigUseCase;
  });

  afterAll(() => {
    process.env.GTI_TEST_MODE = ORIGINAL_TEST_MODE;
  });

  beforeEach(() => {
    resetIO();
    useCase = new ConfigUseCase();
  });

  describe('get', () => {
    it('returns failure for nonexistent key', () => {
      const result = useCase.get('nonexistent');
      expect(result.ok).toBe(false);
      expect(result.code).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('returns value for existing key after set', () => {
      useCase.set('test-key', 'test-value');
      const result = useCase.get('test-key');
      expect(result.ok).toBe(true);
      expect(result.data?.key).toBe('test-key');
      expect(result.data?.value).toBe('test-value');
    });
  });

  describe('set', () => {
    it('sets a string value and returns success', () => {
      const result = useCase.set('my-key', 'my-value');
      expect(result.ok).toBe(true);
      expect(result.data?.key).toBe('my-key');
      expect(result.data?.value).toBe('my-value');
    });

    it('sets a numeric value', () => {
      const result = useCase.set('number-key', 42);
      expect(result.ok).toBe(true);
      expect(result.data?.value).toBe(42);
    });

    it('sets an object value', () => {
      const obj = { nested: true };
      const result = useCase.set('obj-key', obj);
      expect(result.ok).toBe(true);
      expect(result.data?.value).toEqual(obj);
    });
  });

  describe('delete', () => {
    it('returns failure for nonexistent key', () => {
      const result = useCase.delete('no-such-key');
      expect(result.ok).toBe(false);
      expect(result.code).toBe(1);
    });

    it('deletes an existing key and returns its previous value', () => {
      useCase.set('delete-me', 'old-value');
      const result = useCase.delete('delete-me');
      expect(result.ok).toBe(true);
      expect(result.data?.value).toBe('old-value');

      const afterDelete = useCase.get('delete-me');
      expect(afterDelete.ok).toBe(false);
    });
  });

  describe('list', () => {
    it('returns all entries when no prefix is given', () => {
      useCase.set('a', 1);
      useCase.set('b', 2);
      const result = useCase.list();
      expect(result.ok).toBe(true);
      expect(result.data?.count).toBe(2);
      expect(result.data?.entries).toEqual({ a: 1, b: 2 });
    });

    it('filters entries by prefix', () => {
      useCase.set('alpha', 10);
      useCase.set('beta', 20);
      useCase.set('gamma', 30);
      const result = useCase.list('b');
      expect(result.ok).toBe(true);
      expect(result.data?.count).toBe(1);
      expect(result.data?.entries).toEqual({ beta: 20 });
    });

    it('returns empty when no match by prefix', () => {
      useCase.set('only', 1);
      const result = useCase.list('z');
      expect(result.ok).toBe(true);
      expect(result.data?.count).toBe(0);
      expect(result.data?.entries).toEqual({});
    });
  });

  describe('validate', () => {
    it('accepts a valid config object', () => {
      const result = useCase.validate({ theme: 'dark', lang: 'pt-BR' });
      expect(result.ok).toBe(true);
      expect(result.data?.valid).toBe(true);
      expect(result.data?.errors).toEqual([]);
    });

    it('rejects null input', () => {
      const result = useCase.validate(null);
      expect(result.ok).toBe(false);
      expect(result.error?.details).toMatchObject({ valid: false });
    });

    it('rejects non-object input', () => {
      const result = useCase.validate('string');
      expect(result.ok).toBe(false);
      expect(result.error?.details).toMatchObject({ valid: false });
    });

    it('rejects keys starting with underscore', () => {
      const result = useCase.validate({ _reserved: true });
      expect(result.ok).toBe(false);
      const details = result.error?.details as { errors: string[] };
      expect(details.errors.some((e: string) => e.includes('underscore'))).toBe(true);
    });

    it('rejects nested reserved keys', () => {
      const result = useCase.validate({ normal: { _secret: true } });
      expect(result.ok).toBe(false);
      const details = result.error?.details as { errors: string[] };
      expect(details.errors.some((e: string) => e.includes('reserved'))).toBe(true);
    });

    it('rejects empty string keys', () => {
      const result = useCase.validate({ '': 'empty' });
      expect(result.ok).toBe(false);
    });
  });
});
