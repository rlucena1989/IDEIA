import { CircuitBreaker, CircuitBreakerConfig } from '../src/circuit-breaker';
import { DegradationManager } from '../src/resilience-engine';

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

describe('CircuitBreaker', () => {
  const config: CircuitBreakerConfig = {
    name: 'test-breaker',
    failureThreshold: 3,
    successThreshold: 2,
    cooldownMs: 100,
    halfOpenMaxCalls: 2,
    monitoredFailures: 10,
    timeout: 5000,
  };

  it('should start closed', () => {
    const cb = new CircuitBreaker(config);
    expect(cb.getState()).toBe('closed');
  });

  it('should allow successful calls', async () => {
    const cb = new CircuitBreaker(config);
    const result = await cb.call(async () => 'ok');
    expect(result).toBe('ok');
    expect(cb.getState()).toBe('closed');
  });

  it('should open after failureThreshold failures', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 5000 });
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    expect(cb.getState()).toBe('open');
  });

  it('should reject calls when open', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 5000 });
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    await expect(cb.call(async () => 'should not reach')).rejects.toThrow('OPEN');
  });

  it('should use fallback when open', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 5000 });
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    const result = await cb.call(async () => 'rejected', async () => 'fallback');
    expect(result).toBe('fallback');
  });

  it('should transition to half-open after cooldown', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 50 });
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    expect(cb.getState()).toBe('open');
    await delay(70);
    expect(cb.getState()).toBe('half-open');
  });

  it('should close after successThreshold successes in half-open', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 50, successThreshold: 2 });
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    expect(cb.getState()).toBe('open');
    await delay(70);
    expect(cb.getState()).toBe('half-open');
    await cb.call(async () => 'ok1');
    expect(cb.getState()).toBe('half-open');
    await cb.call(async () => 'ok2');
    expect(cb.getState()).toBe('closed');
  });

  it('should re-open on failure in half-open', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 50, halfOpenMaxCalls: 3 });
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    expect(cb.getState()).toBe('open');
    await delay(70);
    expect(cb.getState()).toBe('half-open');
    await cb.call(async () => { throw new Error('probe-fail'); }).catch(() => {});
    expect(cb.getState()).toBe('open');
  });

  it('should return metrics from getMetrics', async () => {
    const cb = new CircuitBreaker(config);
    await cb.call(async () => 'ok');
    await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    const metrics = cb.getMetrics();
    expect(metrics.name).toBe('test-breaker');
    expect(metrics.successCount).toBe(1);
    expect(metrics.failureCount).toBe(1);
    expect(metrics.totalCalls).toBe(2);
    expect(metrics.openCount).toBe(0);
    expect(metrics.halfOpenCount).toBe(0);
    expect(metrics.avgResponseTime).toBeGreaterThanOrEqual(0);
  });

  it('should track openCount and halfOpenCount in metrics', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 50, successThreshold: 1 });
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    await delay(70);
    await cb.call(async () => 'ok');
    const metrics = cb.getMetrics();
    expect(metrics.openCount).toBe(1);
    expect(metrics.halfOpenCount).toBe(1);
  });

  it('should fire onStateChange callbacks', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 50, successThreshold: 1 });
    const changes: Array<{ from: string; to: string }> = [];
    cb.onStateChange((from, to) => { changes.push({ from, to }); });

    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    expect(changes.length).toBe(1);
    expect(changes[0]).toEqual({ from: 'closed', to: 'open' });

    await delay(70);
    expect(changes.length).toBe(2);
    expect(changes[1]).toEqual({ from: 'open', to: 'half-open' });

    await cb.call(async () => 'ok');
    expect(changes.length).toBe(3);
    expect(changes[2]).toEqual({ from: 'half-open', to: 'closed' });
  });

  it('should support multiple onStateChange callbacks', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 5000 });
    const log1: string[] = [];
    const log2: string[] = [];
    cb.onStateChange((_f, t) => { log1.push(t); });
    cb.onStateChange((_f, t) => { log2.push(t); });

    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }

    expect(log1).toEqual(['open']);
    expect(log2).toEqual(['open']);
  });

  it('should reset state', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 5000 });
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    expect(cb.getState()).toBe('open');
    cb.reset();
    expect(cb.getState()).toBe('closed');
    const metrics = cb.getMetrics();
    expect(metrics.totalCalls).toBe(0);
  });

  it('should enforce halfOpenMaxCalls', async () => {
    const cb = new CircuitBreaker({ ...config, cooldownMs: 50, halfOpenMaxCalls: 1 });
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fail'); }).catch(() => {});
    }
    await delay(70);
    expect(cb.getState()).toBe('half-open');
    await cb.call(async () => 'first probe').catch(() => {});
    await expect(cb.call(async () => 'second probe')).rejects.toThrow('half-open max calls reached');
  });

  it('should timeout slow calls', async () => {
    const cb = new CircuitBreaker({ ...config, timeout: 20 });
    await expect(cb.call(async () => { await delay(100); return 'late'; })).rejects.toThrow('timed out');
  });

  it('should track avgResponseTime', async () => {
    const cb = new CircuitBreaker({ ...config, timeout: 5000 });
    await cb.call(async () => { await delay(10); return 'ok'; });
    await cb.call(async () => { await delay(20); return 'ok'; });
    const metrics = cb.getMetrics();
    expect(metrics.avgResponseTime).toBeGreaterThanOrEqual(10);
    expect(metrics.avgResponseTime).toBeLessThan(100);
  });

  it('should work with DegradationManager via createCircuitBreaker', () => {
    const { createCircuitBreaker } = require('../src/circuit-breaker');
    const dm = new DegradationManager();
    const cb = createCircuitBreaker({ name: 'test' }, dm);
    expect(cb.getState()).toBe('closed');
  });
});

describe('createCircuitBreaker', () => {
  it('should create with defaults', () => {
    const { createCircuitBreaker } = require('../src/circuit-breaker');
    const cb = createCircuitBreaker({ name: 'defaults' });
    expect(cb.getState()).toBe('closed');
  });

  it('should handle partial config with old field names', () => {
    const { createCircuitBreaker } = require('../src/circuit-breaker');
    const cb = createCircuitBreaker({
      name: 'legacy',
      resetTimeoutMs: 5000,
      callTimeoutMs: 10000,
    } as Record<string, unknown> as Parameters<typeof createCircuitBreaker>[0]);
    expect(cb.getState()).toBe('closed');
  });
});
