import { Emitter } from '@ideia/core-contributions';
import { CircuitBreaker, CircuitBreakerConfig, CircuitBreakerMetrics, CircuitBreakerRegistry, CircuitState } from './types';

export class DefaultCircuitBreaker implements CircuitBreaker {
  readonly name: string;
  private config: CircuitBreakerConfig;
  private _state: CircuitState = CircuitState.CLOSED;
  private _failureCount = 0;
  private _successCount = 0;
  private _totalCalls = 0;
  private _openCount = 0;
  private _lastFailure?: Date;
  private _lastSuccess?: Date;
  private _openTimer?: NodeJS.Timeout;
  private onStateChangedEmitter = new Emitter<CircuitState>();

  get state() { return this._state; }
  get failureCount() { return this._failureCount; }
  get successCount() { return this._successCount; }
  get onStateChanged() { return this.onStateChangedEmitter.event; }

  constructor(config: CircuitBreakerConfig) {
    this.name = config.name;
    this.config = config;
  }

  async call<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this._totalCalls++;

    if (this._state === CircuitState.OPEN) {
      if (fallback) return fallback();
      throw new Error(`Circuit breaker ${this.name} is OPEN`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  reset(): void {
    this._state = CircuitState.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this.onStateChangedEmitter.fire(this._state);
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      name: this.name,
      state: this._state,
      failureCount: this._failureCount,
      successCount: this._successCount,
      totalCalls: this._totalCalls,
      openCount: this._openCount,
      lastFailure: this._lastFailure,
      lastSuccess: this._lastSuccess,
    };
  }

  private onSuccess(): void {
    this._lastSuccess = new Date();
    if (this._state === CircuitState.HALF_OPEN) {
      this._successCount++;
      if (this._successCount >= this.config.successThreshold) {
        this._state = CircuitState.CLOSED;
        this._failureCount = 0;
        this._successCount = 0;
        this.onStateChangedEmitter.fire(this._state);
      }
    } else {
      this._successCount++;
    }
  }

  private onFailure(): void {
    this._lastFailure = new Date();
    this._failureCount++;
    this._successCount = 0;

    if (this._state === CircuitState.CLOSED && this._failureCount >= this.config.failureThreshold) {
      this.trip();
    } else if (this._state === CircuitState.HALF_OPEN) {
      this.trip();
    }
  }

  private trip(): void {
    this._state = CircuitState.OPEN;
    this._openCount++;
    this.onStateChangedEmitter.fire(this._state);

    this._openTimer = setTimeout(() => {
      this._state = CircuitState.HALF_OPEN;
      this._successCount = 0;
      this.onStateChangedEmitter.fire(this._state);
    }, this.config.timeout);
  }
}

export class DefaultCircuitBreakerRegistry implements CircuitBreakerRegistry {
  private breakers = new Map<string, DefaultCircuitBreaker>();

  getOrCreate(config: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(config.name);
    if (!breaker) {
      breaker = new DefaultCircuitBreaker(config);
      this.breakers.set(config.name, breaker);
    }
    return breaker;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getAll(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }
}
