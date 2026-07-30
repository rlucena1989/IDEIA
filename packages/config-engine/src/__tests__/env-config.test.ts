import { getEnvConfig, reloadEnvConfig, validateEnvConfig, EnvConfig } from '../env-config';

describe('env-config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    reloadEnvConfig();
  });

  it('should return default values when no env vars are set', () => {
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    delete process.env.PORT;
    reloadEnvConfig();
    const config = getEnvConfig();
    expect(config.nodeEnv).toBe('development');
    expect(config.logLevel).toBe('info');
    expect(config.port).toBe(3000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.authProvider).toBe('none');
  });

  it('should read values from environment variables', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8080';
    process.env.LOG_LEVEL = 'debug';
    process.env.AUTH_PROVIDER = 'auth0';
    process.env.JWT_SECRET = 'my-secret-key';
    reloadEnvConfig();

    const config = getEnvConfig();
    expect(config.nodeEnv).toBe('production');
    expect(config.port).toBe(8080);
    expect(config.logLevel).toBe('debug');
    expect(config.authProvider).toBe('auth0');
    expect(config.jwtSecret).toBe('my-secret-key');
  });

  it('should parse integer env vars correctly', () => {
    process.env.PORT = 'invalid';
    process.env.IDEIA_MAX_WORKERS = '8';
    reloadEnvConfig();

    const config = getEnvConfig();
    expect(config.port).toBe(3000); // Invalid → default
    expect(config.ideiaMaxWorkers).toBe(8); // Valid
  });

  it('should parse boolean env vars correctly', () => {
    process.env.ENABLE_EXPERIMENTAL_FEATURES = 'true';
    process.env.ENABLE_TELEMETRY = '0';
    reloadEnvConfig();

    const config = getEnvConfig();
    expect(config.enableExperimentalFeatures).toBe(true);
    expect(config.enableTelemetry).toBe(false);
    expect(config.enableLocalAi).toBe(true); // default
  });

  it('should validate production config', () => {
    process.env.NODE_ENV = 'production';
    reloadEnvConfig();

    const config = getEnvConfig();
    const errors = validateEnvConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
    expect(errors.some(e => e.includes('AUTH_PROVIDER'))).toBe(true);
  });

  it('should pass validation with good production config', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'real-secret';
    process.env.SESSION_SECRET = 'real-session-secret';
    process.env.OPENAI_API_KEY = 'sk-real-key';
    process.env.AUTH_PROVIDER = 'auth0';
    reloadEnvConfig();

    const errors = validateEnvConfig(getEnvConfig());
    expect(errors.length).toBe(0);
  });

  it('should respect envOneOf constraints', () => {
    process.env.LOG_LEVEL = 'invalid';
    reloadEnvConfig();

    const config = getEnvConfig();
    expect(config.logLevel).toBe('info'); // Invalid → default
  });

  it('should provide LLM configuration', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OPENAI_MODEL = 'gpt-4';
    reloadEnvConfig();

    const config = getEnvConfig();
    expect(config.openaiApiKey).toBe('sk-test');
    expect(config.openaiModel).toBe('gpt-4');
    expect(config.ollamaBaseUrl).toBe('http://localhost:11434'); // Default
  });
});
