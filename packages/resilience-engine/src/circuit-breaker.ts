import { createLogger } from '@ideia/logger';
import { DegradationManager } from './resilience-engine';

const log = createLogger('resilience-engine:circuit-breaker');

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  cooldownMs: number;
  halfOpenMaxCalls: number;
  monitoredFailures: number;
  timeout: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  openCount: number;
  halfOpenCount: number;
}

export interface BreakerMetrics {
  name: string;
  successCount: number;
  failureCount: number;
  totalCalls: number;
  openCount: number;
  halfOpenCount: number;
  avgResponseTime: number;
}

type Fn<T> = () => Promise<T>;

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private totalSuccesses = 0;
  private totalFailures = 0;
  private lastFailure: number | null = null;
  private lastSuccess: number | null = null;
  private openCount = 0;
  private halfOpenCount = 0;
  private halfOpenCalls = 0;
  private totalCallCount = 0;
  private responseTimes: number[] = [];
  private config: CircuitBreakerConfig;
  private stateChangeCallbacks: Array<(from: CircuitState, to: CircuitState, name: string) => void> = [];
  private halfOpenTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      name: config.name,
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      cooldownMs: config.cooldownMs ?? 30000,
      halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
      monitoredFailures: config.monitoredFailures ?? 10,
      timeout: config.timeout ?? 30000,
    };
  }

  async call<T>(fn: Fn<T>, fallback?: Fn<T>): Promise<T> {
    if (this.state === 'open') {
      if (fallback) return fallback();
      throw new Error(`Circuit breaker ${this.config.name} is OPEN`);
    }

    if (this.state === 'half-open') {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        if (fallback) return fallback();
        throw new Error(`Circuit breaker ${this.config.name} half-open max calls reached`);
      }
      this.halfOpenCalls++;
    }

    const start = Date.now();
    this.totalCallCount++;

    try {
      const result = await this.executeWithTimeout(fn);
      this.trackResponseTime(Date.now() - start);
      this.onSuccess();
      return result;
    } catch (err) {
      this.trackResponseTime(Date.now() - start);
      this.onFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      openCount: this.openCount,
      halfOpenCount: this.halfOpenCount,
    };
  }

  getMetrics(): BreakerMetrics {
    const avgResponseTime = this.responseTimes.length > 0
      ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
      : 0;
    return {
      name: this.config.name,
      successCount: this.totalSuccesses,
      failureCount: this.totalFailures,
      totalCalls: this.totalCallCount,
      openCount: this.openCount,
      halfOpenCount: this.halfOpenCount,
      avgResponseTime,
    };
  }

  onStateChange(callback: (from: CircuitState, to: CircuitState, name: string) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  reset(): void {
    this.clearHalfOpenTimer();
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.totalSuccesses = 0;
    this.totalFailures = 0;
    this.totalCallCount = 0;
    this.halfOpenCalls = 0;
    this.responseTimes = [];
  }

  private trackResponseTime(ms: number): void {
    this.responseTimes.push(ms);
    if (this.responseTimes.length > 100) this.responseTimes.shift();
  }

  private clearHalfOpenTimer(): void {
    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer);
      this.halfOpenTimer = null;
    }
  }

  private onSuccess(): void {
    this.lastSuccess = Date.now();
    this.successes++;
    this.totalSuccesses++;
    this.failures = 0;

    if (this.state === 'half-open') {
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    }
  }

  private onFailure(): void {
    this.lastFailure = Date.now();
    this.failures++;
    this.totalFailures++;
    this.successes = 0;

    if (this.state === 'closed') {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo('open');
      }
    }

    if (this.state === 'half-open') {
      this.transitionTo('open');
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    this.halfOpenCalls = 0;
    this.clearHalfOpenTimer();

    if (newState === 'open') {
      this.openCount++;
      this.halfOpenTimer = setTimeout(() => {
        if (this.state === 'open') {
          this.transitionTo('half-open');
        }
      }, this.config.cooldownMs);
    }
    if (newState === 'half-open') this.halfOpenCount++;

    for (const cb of this.stateChangeCallbacks) {
      try { cb(oldState, newState, this.config.name); } catch (err) { log.warn('state change callback failed', { error: String(err) }); }
    }
  }

  private async executeWithTimeout<T>(fn: Fn<T>): Promise<T> {
    const timeoutMs = this.config.timeout;
    if (!timeoutMs || timeoutMs <= 0) return fn();

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Circuit breaker ${this.config.name} call timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
      fn().then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
  }
}

export function createCircuitBreaker(config: Partial<CircuitBreakerConfig> & { name: string }, degradationManager?: DegradationManager): CircuitBreaker {
  const breaker = new CircuitBreaker({
    name: config.name,
    failureThreshold: config.failureThreshold ?? 5,
    successThreshold: config.successThreshold ?? 2,
    cooldownMs: (config as Record<string, unknown>).cooldownMs as number ?? (config as Record<string, unknown>).resetTimeoutMs as number ?? 30000,
    halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
    monitoredFailures: config.monitoredFailures ?? 10,
    timeout: (config as Record<string, unknown>).timeout as number ?? (config as Record<string, unknown>).callTimeoutMs as number ?? 30000,
  });

  if (degradationManager) {
    breaker.onStateChange((_from, to, _name) => {
      if (to === 'open') {
        degradationManager.setMode('degraded');
      } else if (to === 'closed' && degradationManager.mode === 'degraded') {
        degradationManager.setMode('normal');
      }
    });
  }

  return breaker;
}
