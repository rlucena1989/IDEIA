import { CircuitBreakerConfig, CircuitState, ExecutionResult, RetryConfig } from './types';
import { createLogger } from '@ideia/logger';
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0; private lastFailureTime = 0;
  constructor(private config: CircuitBreakerConfig) {}
  async call<T>(fn: () => Promise<T>): Promise<ExecutionResult<T>> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeoutMs) this.state = 'half_open';
      else return { success: false, error: `Circuit open for ${this.config.name}`, attempts: 0, durationMs: 0 };
    }
    const start = Date.now();
    try {
      const data = await fn(); const durationMs = Date.now() - start;
      if (this.state === 'half_open') { this.state = 'closed'; this.failures = 0; }
      return { success: true, data, attempts: 1, durationMs };
    } catch (e) {
      this.failures++; this.lastFailureTime = Date.now();
      if (this.failures >= this.config.threshold) this.state = 'open';
      return { success: false, error: String(e), attempts: 1, durationMs: Date.now() - start };
    }
  }
  getState(): CircuitState { return this.state; }
  reset(): void { this.state = 'closed'; this.failures = 0; }
}
export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<ExecutionResult<T>> {
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const start = Date.now(); const data = await fn();
      return { success: true, data, attempts: attempt, durationMs: Date.now() - start };
    } catch (e) {
      lastError = String(e);
      if (attempt < config.maxRetries) {
        const delay = config.strategy === 'exponential' ? config.baseDelayMs * Math.pow(2, attempt - 1)
          : config.strategy === 'linear' ? config.baseDelayMs * attempt : config.baseDelayMs;
        await new Promise(r => setTimeout(r, Math.min(delay, 30000)));
      }
    }
  }
  return { success: false, error: lastError, attempts: config.maxRetries, durationMs: 0 };
}
export function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker { return new CircuitBreaker(config); }
