import { DefaultCircuitBreaker, DefaultCircuitBreakerRegistry } from './circuit-breaker';
import { CircuitBreakerConfig, CircuitState } from './types';

const testConfig = (overrides: Partial<CircuitBreakerConfig> = {}): CircuitBreakerConfig => ({
  name: 'test',
  failureThreshold: 2,
  successThreshold: 2,
  timeout: 5000,
  halfOpenTimeout: 5000,
  halfOpenMaxRequests: 1,
  ...overrides,
});

describe('DefaultCircuitBreaker', () => {
  it('should start closed and succeed', async () => {
    const cb = new DefaultCircuitBreaker(testConfig({ name: 'test-closed' }));
    const result = await cb.call(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(cb.state).toBe(CircuitState.CLOSED);
  });

  it('should open after threshold failures', async () => {
    const cb = new DefaultCircuitBreaker(testConfig({ name: 'test-open', failureThreshold: 2 }));
    await cb.call(() => Promise.reject(new Error('fail1'))).catch(() => {});
    await cb.call(() => Promise.reject(new Error('fail2'))).catch(() => {});
    expect(cb.state).toBe(CircuitState.OPEN);
  });

  it('should reject calls when open', async () => {
    const cb = new DefaultCircuitBreaker(testConfig({ name: 'test-reject', failureThreshold: 1 }));
    await cb.call(() => Promise.reject(new Error('fail'))).catch(() => {});
    await expect(cb.call(() => Promise.resolve('ok'))).rejects.toThrow('OPEN');
  });

  it('should use fallback when open', async () => {
    const cb = new DefaultCircuitBreaker(testConfig({ name: 'test-fallback', failureThreshold: 1 }));
    await cb.call(() => Promise.reject(new Error('fail'))).catch(() => {});
    const result = await cb.call(() => Promise.reject(new Error('still fail')), () => Promise.resolve('fallback'));
    expect(result).toBe('fallback');
  });

  it('should transition to half-open after timeout', async () => {
    jest.useFakeTimers();
    const cb = new DefaultCircuitBreaker(testConfig({ name: 'test-half', failureThreshold: 1, timeout: 1000, halfOpenTimeout: 1000 }));
    await cb.call(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(cb.state).toBe(CircuitState.OPEN);
    jest.advanceTimersByTime(1000);
    expect(cb.state).toBe(CircuitState.HALF_OPEN);
    jest.useRealTimers();
  });

  it('should limit requests in half-open state', async () => {
    const cb = new DefaultCircuitBreaker(testConfig({ name: 'test-half-limit', failureThreshold: 1, timeout: 100, halfOpenTimeout: 100, halfOpenMaxRequests: 1 }));
    await cb.call(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(cb.state).toBe(CircuitState.OPEN);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cb.state).toBe(CircuitState.HALF_OPEN);

    const p1 = cb.call(() => new Promise<string>(resolve => setTimeout(() => resolve('ok1'), 10)));
    await expect(cb.call(() => Promise.resolve('ok2'))).rejects.toThrow('half-open max requests');
    await new Promise(resolve => setTimeout(resolve, 20));
    const r1 = await p1;
    expect(r1).toBe('ok1');
  });

  it('should close after enough successes in half-open', async () => {
    const cb = new DefaultCircuitBreaker(testConfig({ name: 'test-close', failureThreshold: 1, successThreshold: 2, timeout: 50, halfOpenTimeout: 50, halfOpenMaxRequests: 2 }));
    await cb.call(() => Promise.reject(new Error('fail'))).catch(() => {});

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(cb.state).toBe(CircuitState.HALF_OPEN);

    await cb.call(() => Promise.resolve('ok1'));
    expect(cb.state).toBe(CircuitState.HALF_OPEN);
    await cb.call(() => Promise.resolve('ok2'));
    expect(cb.state).toBe(CircuitState.CLOSED);
  });

  it('should track metrics correctly', async () => {
    const cb = new DefaultCircuitBreaker(testConfig({ name: 'test-metrics', failureThreshold: 2 }));
    await cb.call(() => Promise.resolve('ok'));
    await cb.call(() => Promise.reject(new Error('fail1'))).catch(() => {});
    const metrics = cb.getMetrics();
    expect(metrics.totalCalls).toBe(2);
    expect(metrics.failureCount).toBe(1);
    expect(metrics.successCount).toBe(0);
    expect(metrics.state).toBe(CircuitState.CLOSED);
  });

  it('should emit events on state changes', async () => {
    const cb = new DefaultCircuitBreaker(testConfig({ name: 'test-events', failureThreshold: 1, timeout: 100 }));
    const states: CircuitState[] = [];
    cb.onStateChanged(s => states.push(s));

    await cb.call(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(states).toContain(CircuitState.OPEN);
  });

  it('should reset to closed state', async () => {
    const cb = new DefaultCircuitBreaker(testConfig({ name: 'test-reset', failureThreshold: 1 }));
    await cb.call(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(cb.state).toBe(CircuitState.OPEN);
    cb.reset();
    expect(cb.state).toBe(CircuitState.CLOSED);
    expect(cb.failureCount).toBe(0);
    expect(cb.successCount).toBe(0);
  });
});

describe('DefaultCircuitBreakerRegistry', () => {
  it('should create and reuse circuit breakers', () => {
    const registry = new DefaultCircuitBreakerRegistry();
    const cfg1 = testConfig({ name: 'svc-a' });
    const cfg2 = testConfig({ name: 'svc-a' });
    const cb1 = registry.getOrCreate(cfg1);
    const cb2 = registry.getOrCreate(cfg2);
    expect(cb1).toBe(cb2);
  });

  it('should create separate instances for different names', () => {
    const registry = new DefaultCircuitBreakerRegistry();
    const cfg1 = testConfig({ name: 'svc-a' });
    const cfg2 = testConfig({ name: 'svc-b' });
    const cb1 = registry.getOrCreate(cfg1);
    const cb2 = registry.getOrCreate(cfg2);
    expect(cb1).not.toBe(cb2);
  });

  it('should get all registered breakers', () => {
    const registry = new DefaultCircuitBreakerRegistry();
    registry.getOrCreate(testConfig({ name: 'a' }));
    registry.getOrCreate(testConfig({ name: 'b' }));
    expect(registry.getAll()).toHaveLength(2);
  });

  it('should return undefined for unknown name', () => {
    const registry = new DefaultCircuitBreakerRegistry();
    expect(registry.get('unknown')).toBeUndefined();
  });
});
