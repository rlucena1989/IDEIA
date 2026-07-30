import { ConfigUseCase } from '../../domain/config-use-case';
import { resetIO, createIO } from '../../io';
import type { MockIOContainer } from '../../io/mock';

describe('ConfigUseCase', () => {
  let useCase: ConfigUseCase;
  let mockIO: MockIOContainer;

  beforeEach(() => {
    resetIO();
    process.env['GTI_TEST_MODE'] = '1';
    const io = createIO();
    if ('_reset' in io) {
      mockIO = io as unknown as MockIOContainer;
      mockIO._reset();
    }
    useCase = new ConfigUseCase();
  });

  afterEach(() => {
    process.env['GTI_TEST_MODE'] = '0';
    resetIO();
  });

  it('should be defined', () => {
    expect(ConfigUseCase).toBeDefined();
  });

  it('should set and get config', () => {
    const setResult = useCase.set('theme', 'dark');
    expect(setResult.ok).toBe(true);

    const getResult = useCase.get('theme');
    expect(getResult.ok).toBe(true);
    expect(getResult.data?.value).toBe('dark');
  });

  it('should fail when getting missing key', () => {
    const result = useCase.get('non-existent-key');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
  });

  it('should delete existing config', () => {
    useCase.set('test-key', 'test-value');
    const deleteResult = useCase.delete('test-key');
    expect(deleteResult.ok).toBe(true);

    const getResult = useCase.get('test-key');
    expect(getResult.ok).toBe(false);
  });

  it('should fail when deleting missing key', () => {
    const result = useCase.delete('non-existent');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
  });

  it('should list all config entries', () => {
    useCase.set('key1', 'value1');
    useCase.set('key2', 'value2');

    const result = useCase.list();
    expect(result.ok).toBe(true);
    expect(result.data!.count).toBe(2);
  });

  it('should list with prefix filter', () => {
    useCase.set('db.host', 'localhost');
    useCase.set('db.port', 5432);
    useCase.set('theme', 'light');

    const result = useCase.list('db.');
    expect(result.ok).toBe(true);
    expect(result.data!.count).toBe(2);
  });

  it('should validate valid config', () => {
    const result = useCase.validate({ theme: 'dark', port: 3000 });
    expect(result.ok).toBe(true);
    expect(result.data?.valid).toBe(true);
  });

  it('should reject null config', () => {
    const result = useCase.validate(null);
    expect(result.ok).toBe(false);
  });

  it('should reject config with reserved keys', () => {
    const result = useCase.validate({ _private: 'secret' });
    expect(result.ok).toBe(false);
  });
});
