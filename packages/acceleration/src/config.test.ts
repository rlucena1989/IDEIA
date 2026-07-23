import { loadConfig } from './config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.AI_MODE;
    delete process.env.AI_LOOP;
    delete process.env.AI_STOP_ON_FAILURE;
    delete process.env.AI_CONCURRENCY;
    delete process.env.AI_REPORT_DIR;
    delete process.env.AI_CACHE_FILE;
    delete process.env.AI_STATE_FILE;
    delete process.env.AI_METRICS_FILE;
    delete process.env.AI_TELEMETRY_FILE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load default balanced mode config', () => {
    const config = loadConfig();
    expect(config.mode).toBe('balanced');
    expect(config.loop).toBe(false);
    expect(config.stopOnFailure).toBe(true);
    expect(config.concurrency).toBe(4);
    expect(config.reportDir).toBe('.ai-devkit/reports');
    expect(config.cacheFile).toBe('.ai-devkit/cache.json');
    expect(config.stateFile).toBe('.ai-devkit/state.json');
    expect(config.metricsFile).toBe('.ai-devkit/metrics.json');
    expect(config.telemetryFile).toBe('.ai-devkit/telemetry.json');
  });

  it('should respect AI_MODE env var', () => {
    process.env.AI_MODE = 'fast';
    const config = loadConfig();
    expect(config.mode).toBe('fast');
    expect(config.concurrency).toBe(8);
  });

  it('should respect AI_LOOP env var', () => {
    process.env.AI_LOOP = 'true';
    const config = loadConfig();
    expect(config.loop).toBe(true);
  });

  it('should respect AI_STOP_ON_FAILURE env var', () => {
    process.env.AI_STOP_ON_FAILURE = 'false';
    const config = loadConfig();
    expect(config.stopOnFailure).toBe(false);
  });

  it('should respect AI_CONCURRENCY env var', () => {
    process.env.AI_CONCURRENCY = '16';
    const config = loadConfig();
    expect(config.concurrency).toBe(16);
  });

  it('should fallback to default for invalid AI_CONCURRENCY', () => {
    process.env.AI_CONCURRENCY = '0';
    const config = loadConfig();
    expect(config.concurrency).toBe(4);
  });

  it('should fallback to default for invalid AI_MODE', () => {
    process.env.AI_MODE = 'invalid';
    const config = loadConfig();
    expect(config.mode).toBe('balanced');
  });
});