import {
  SelfHealingEngine,
  createBuiltinNatsHealer,
  createBuiltinLlmHealer,
  createBuiltinFsHealer,
  createBuiltinSearchHealer,
  createBuiltinGitHealer,
} from '../self-healing';

describe('SelfHealingEngine', () => {
  it('should register healers', () => {
    const engine = new SelfHealingEngine();
    engine.registerHealer('test', async () => true);
    // no error
  });

  it('should call healer on failure', async () => {
    const engine = new SelfHealingEngine({ cooldownMs: 0 });
    const healer = jest.fn().mockResolvedValue(true);
    engine.registerHealer('svc', healer);
    const result = await engine.onFailure('svc', 'error msg');
    expect(result).toBe(true);
    expect(healer).toHaveBeenCalled();
  });

  it('should return false when no healer registered', async () => {
    const engine = new SelfHealingEngine({ cooldownMs: 0 });
    const result = await engine.onFailure('unknown', 'error');
    expect(result).toBe(false);
  });

  it('should respect cooldown period', async () => {
    const engine = new SelfHealingEngine({ cooldownMs: 60000 });
    const healer = jest.fn().mockResolvedValue(true);
    engine.registerHealer('svc', healer);
    await engine.onFailure('svc', 'err');
    healer.mockClear();
    const result = await engine.onFailure('svc', 'err again');
    expect(result).toBe(false);
    expect(healer).not.toHaveBeenCalled();
  });

  it('should respect max retries', async () => {
    const engine = new SelfHealingEngine({ cooldownMs: 0, maxRetries: 2 });
    const healer = jest.fn().mockResolvedValue(false);
    engine.registerHealer('svc', healer);
    await engine.onFailure('svc', 'err');
    await engine.onFailure('svc', 'err');
    await engine.onFailure('svc', 'err');
    expect(healer).toHaveBeenCalledTimes(2);
  });

  it('should track heal history', async () => {
    const engine = new SelfHealingEngine({ cooldownMs: 0 });
    const healer = jest.fn().mockResolvedValue(true);
    engine.registerHealer('svc', healer);
    await engine.onFailure('svc', 'err');
    const history = engine.getHealHistory();
    expect(history).toHaveLength(1);
    expect(history[0].service).toBe('svc');
    expect(history[0].success).toBe(true);
    expect(history[0].error).toBe('err');
  });

  it('should compute stats', async () => {
    const engine = new SelfHealingEngine({ cooldownMs: 0 });
    engine.registerHealer('a', async () => true);
    engine.registerHealer('b', async () => false);
    await engine.onFailure('a', 'err');
    await engine.onFailure('b', 'err');
    const stats = engine.getStats();
    expect(stats.totalHeals).toBe(2);
    expect(stats.successfulHeals).toBe(1);
    expect(stats.failedHeals).toBe(1);
    expect(stats.avgRecoveryTime).toBeGreaterThanOrEqual(0);
  });

  it('should reset failure count on success', async () => {
    const engine = new SelfHealingEngine({ cooldownMs: 0, maxRetries: 2 });
    let attempts = 0;
    engine.registerHealer('svc', async () => { attempts++; return attempts > 1; });
    await engine.onFailure('svc', 'err');
    const result = await engine.onFailure('svc', 'err');
    expect(result).toBe(true);
    expect(attempts).toBe(2);
  });

  it('should heal all services on autoHeal', async () => {
    const engine = new SelfHealingEngine();
    engine.registerHealer('a', async () => true);
    engine.registerHealer('b', async () => false);
    const results = await engine.autoHeal();
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
  });

  it('should return empty history initially', () => {
    const engine = new SelfHealingEngine();
    expect(engine.getHealHistory()).toEqual([]);
  });

  it('should return zero stats initially', () => {
    const engine = new SelfHealingEngine();
    const stats = engine.getStats();
    expect(stats.totalHeals).toBe(0);
    expect(stats.successfulHeals).toBe(0);
    expect(stats.failedHeals).toBe(0);
    expect(stats.avgRecoveryTime).toBe(0);
  });
});

describe('built-in healers', () => {
  it('createBuiltinNatsHealer returns a function', () => {
    const healer = createBuiltinNatsHealer('nats://localhost:4222');
    expect(typeof healer).toBe('function');
  });

  it('createBuiltinLlmHealer returns a function', () => {
    const healer = createBuiltinLlmHealer('http://localhost:11434');
    expect(typeof healer).toBe('function');
  });

  it('createBuiltinFsHealer returns a function that checks paths', async () => {
    const healer = createBuiltinFsHealer(['.']);
    const result = await healer();
    expect(typeof result).toBe('boolean');
  });

  it('createBuiltinSearchHealer returns a function', () => {
    const healer = createBuiltinSearchHealer();
    expect(typeof healer).toBe('function');
  });

  it('createBuiltinGitHealer returns a function', () => {
    const healer = createBuiltinGitHealer();
    expect(typeof healer).toBe('function');
  });
});
