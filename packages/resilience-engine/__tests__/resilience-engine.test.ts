import { Bulkhead, DegradationManager, executeWithPolicy } from '../src/resilience-engine';

describe('Bulkhead', () => {
  it('should limit concurrent calls', async () => {
    const bh = new Bulkhead({ name: 'test', maxConcurrent: 2, timeoutMs: 5000 });
    const results = await Promise.all([bh.run(async () => 'a'), bh.run(async () => 'b')]);
    expect(results).toEqual(['a', 'b']);
  });

  it('should report utilization', async () => {
    const bh = new Bulkhead({ name: 'test', maxConcurrent: 5, timeoutMs: 5000 });
    expect(bh.utilization).toBe(0);
  });

  it('should queue when at capacity', async () => {
    const bh = new Bulkhead({ name: 'test', maxConcurrent: 1, timeoutMs: 5000 });
    const slow = bh.run(async () => { await new Promise(r => setTimeout(r, 50)); return 'slow'; });
    await new Promise(r => setTimeout(r, 5));
    const fast = bh.run(async () => 'fast');
    const [s, f] = await Promise.all([slow, fast]);
    expect(s).toBe('slow');
    expect(f).toBe('fast');
  });

  it('should reject when queue is full', async () => {
    const bh = new Bulkhead({ name: 'test', maxConcurrent: 1, timeoutMs: 100 });
    bh.run(async () => { await new Promise(r => setTimeout(r, 200)); return 'x'; }).catch(() => {});
    for (let i = 0; i < 100; i++) {
      bh.run(async () => 'x').catch(() => {});
    }
    await expect(bh.run(async () => 'overflow')).rejects.toThrow('queue full');
  });

  it('should timeout slow operations', async () => {
    const bh = new Bulkhead({ name: 'test', maxConcurrent: 1, timeoutMs: 10 });
    await expect(bh.run(async () => { await new Promise(r => setTimeout(r, 100)); return 'late'; })).rejects.toThrow('timeout');
  });
});

describe('DegradationManager', () => {
  it('should start in normal mode', () => {
    const dm = new DegradationManager();
    expect(dm.mode).toBe('normal');
  });

  it('should change mode', () => {
    const dm = new DegradationManager();
    dm.setMode('emergency');
    expect(dm.isReadOnly).toBe(true);
    expect(dm.isFeatureEnabled('agents')).toBe(false);
  });

  it('should track history', () => {
    const dm = new DegradationManager();
    dm.setMode('degraded');
    dm.setMode('normal');
    expect(dm.getHistory()).toHaveLength(2);
  });

  it('should disable analytics in degraded mode', () => {
    const dm = new DegradationManager();
    dm.setMode('degraded');
    expect(dm.isFeatureEnabled('analytics')).toBe(false);
    expect(dm.isFeatureEnabled('observability')).toBe(true);
  });

  it('should allow all features in normal mode', () => {
    const dm = new DegradationManager();
    expect(dm.isFeatureEnabled('agents')).toBe(true);
    expect(dm.isFeatureEnabled('observability')).toBe(true);
  });

  it('should disable agents and chat in emergency', () => {
    const dm = new DegradationManager();
    dm.setMode('emergency');
    expect(dm.isFeatureEnabled('agents')).toBe(false);
    expect(dm.isFeatureEnabled('security')).toBe(true);
  });
});

describe('executeWithPolicy', () => {
  it('should execute successful function', async () => {
    const r = await executeWithPolicy(async () => 'ok', { maxRetries: 2, baseDelayMs: 5, timeoutMs: 1000, circuitThreshold: 3, circuitResetMs: 1000, bulkheadMaxConcurrent: 5 });
    expect(r).toBe('ok');
  });

  it('should retry on failure', async () => {
    let tries = 0;
    const r = await executeWithPolicy(async () => { tries++; if (tries < 3) throw new Error('fail'); return 'ok'; }, { maxRetries: 3, baseDelayMs: 5, timeoutMs: 1000, circuitThreshold: 3, circuitResetMs: 1000, bulkheadMaxConcurrent: 5 });
    expect(r).toBe('ok');
    expect(tries).toBe(3);
  });

  it('should fail after max retries', async () => {
    let tries = 0;
    await expect(executeWithPolicy(async () => { tries++; throw new Error('always fail'); }, { maxRetries: 2, baseDelayMs: 5, timeoutMs: 1000, circuitThreshold: 3, circuitResetMs: 100, bulkheadMaxConcurrent: 5 })).rejects.toThrow();
    expect(tries).toBe(3);
  });

  it('should apply retry delay', async () => {
    let tries = 0;
    const start = Date.now();
    await expect(executeWithPolicy(async () => { tries++; throw new Error('fail'); }, { maxRetries: 2, baseDelayMs: 50, timeoutMs: 5000, circuitThreshold: 10, circuitResetMs: 5000, bulkheadMaxConcurrent: 5 })).rejects.toThrow();
    expect(tries).toBe(3);
    expect(Date.now() - start).toBeGreaterThan(50);
  });
});
