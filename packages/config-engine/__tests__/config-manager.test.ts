import { ConfigManager, config } from '../src/config-manager';

describe('ConfigManager', () => {
  beforeEach(() => {
    delete process.env.TEST_KEY;
    delete process.env.TEST_NUMBER;
    delete process.env.TEST_BOOL;
    delete process.env.TEST_SECRET;
    delete process.env.REQUIRED_VAR;
  });

  test('singleton pattern', () => {
    const a = ConfigManager.getInstance();
    const b = ConfigManager.getInstance();
    expect(a).toBe(b);
  });

  test('get returns default for unset env var with schema default', () => {
    expect(config.get('NODE_ENV')).toBe('development');
    expect(config.get('ENABLE_TELEMETRY')).toBe(false);
    expect(config.get('EVENT_BUS_TYPE')).toBe('auto');
  });

  test('get returns process.env value when set', () => {
    process.env.NODE_ENV = 'test';
    expect(config.get('NODE_ENV')).toBe('test');
  });

  test('get returns fallback when env not set and no schema default', () => {
    expect(config.get('TEST_KEY' as any, 'fallback')).toBe('fallback');
  });

  test('get returns undefined for unset optional var without default', () => {
    expect(config.get('TEST_KEY' as any)).toBeUndefined();
  });

  test('get casts number types', () => {
    process.env.PORT = '8080';
    expect(config.get('PORT')).toBe(8080);
  });

  test('get casts boolean types', () => {
    process.env.CI = 'true';
    expect(config.get('CI')).toBe(true);

    process.env.CI = 'false';
    expect(config.get('CI')).toBe(false);
  });

  test('getSecret returns undefined for non-secret keys', () => {
    expect(config.getSecret('NODE_ENV')).toBeUndefined();
  });

  test('getSecret returns value for sensitive keys', () => {
    process.env.OPENAI_API_KEY = 'sk-test-12345';
    config.init();
    expect(config.getSecret('OPENAI_API_KEY')).toBe('sk-test-12345');
  });

  test('maskSecret masks middle of string', () => {
    expect(config.maskSecret('sk-test-key-abc')).toBe('sk-t****-abc');
    expect(config.maskSecret('short')).toBe('****');
  });

  test('getMasked returns masked secret', () => {
    process.env.API_KEY = 'my-api-key-123';
    config.init();
    const masked = config.getMasked('API_KEY');
    expect(masked).toContain('****');
    expect(masked).not.toContain('my-api-key-123');
  });

  test('getAll returns all non-sensitive vars', () => {
    const all = config.getAll();
    expect(all.NODE_ENV).toBeDefined();
    expect(all.OPENAI_API_KEY).toBeUndefined();
  });

  test('getAll with includeSecrets returns all vars', () => {
    const all = config.getAll(true);
    expect(all.OPENAI_API_KEY).toBeDefined();
  });

  test('validate returns errors for missing required vars', () => {
    const errors = config.validate();
    expect(Array.isArray(errors)).toBe(true);
  });

  test('init with schema merges custom schema', () => {
    const mgr = ConfigManager.getInstance();
    mgr.init({
      schema: {
        CUSTOM_VAR: { type: 'string', default: 'custom', description: 'Test' },
      },
    });
    expect(config.get('CUSTOM_VAR' as any)).toBe('custom');
  });

  test('number cast returns fallback for NaN', () => {
    process.env.PORT = 'not-a-number';
    expect(config.get('PORT')).toBe('not-a-number');
  });

  test('boolean cast handles 1 and 0', () => {
    process.env.CI = '1';
    expect(config.get('CI')).toBe(true);
    process.env.CI = '0';
    expect(config.get('CI')).toBe(false);
  });
});
