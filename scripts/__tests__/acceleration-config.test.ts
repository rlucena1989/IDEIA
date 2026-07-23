import { loadConfig } from '../acceleration/config';

describe('acceleration - config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.AI_MODE;
    delete process.env.AI_LOOP;
    delete process.env.AI_STOP_ON_FAILURE;
    delete process.env.AI_CONCURRENCY;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('deve carregar config padrao (balanced, loop=false, stopOnFailure=true)', () => {
    const cfg = loadConfig();
    expect(cfg.mode).toBe('balanced');
    expect(cfg.concurrency).toBe(4);
    expect(cfg.loop).toBe(false);
    expect(cfg.stopOnFailure).toBe(true);
  });

  it('deve respeitar AI_MODE=fast com concurrency 8', () => {
    process.env.AI_MODE = 'fast';
    const cfg = loadConfig();
    expect(cfg.mode).toBe('fast');
    expect(cfg.concurrency).toBe(8);
  });

  it('deve respeitar AI_MODE=deep com concurrency 2', () => {
    process.env.AI_MODE = 'deep';
    const cfg = loadConfig();
    expect(cfg.mode).toBe('deep');
    expect(cfg.concurrency).toBe(2);
  });

  it('deve respeitar AI_CONCURRENCY personalizado', () => {
    process.env.AI_CONCURRENCY = '12';
    const cfg = loadConfig();
    expect(cfg.concurrency).toBe(12);
  });

  it('deve respeitar AI_LOOP=true', () => {
    process.env.AI_LOOP = 'true';
    const cfg = loadConfig();
    expect(cfg.loop).toBe(true);
  });

  it('deve respeitar AI_STOP_ON_FAILURE=false', () => {
    process.env.AI_STOP_ON_FAILURE = 'false';
    const cfg = loadConfig();
    expect(cfg.stopOnFailure).toBe(false);
  });

  it('deve usar paths padrao se nao definidos', () => {
    const cfg = loadConfig();
    expect(cfg.reportDir).toBe('.ai-devkit/reports');
    expect(cfg.cacheFile).toBe('.ai-devkit/cache.json');
    expect(cfg.stateFile).toBe('.ai-devkit/state.json');
    expect(cfg.metricsFile).toBe('.ai-devkit/metrics.json');
  });

  it('deve respeitar paths via env', () => {
    process.env.AI_REPORT_DIR = '/tmp/reports';
    process.env.AI_CACHE_FILE = '/tmp/cache.json';
    const cfg = loadConfig();
    expect(cfg.reportDir).toBe('/tmp/reports');
    expect(cfg.cacheFile).toBe('/tmp/cache.json');
  });
});