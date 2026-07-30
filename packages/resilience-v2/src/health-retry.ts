import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { HealthCheck, HealthCheckResult, HealthCheckRegistry, HealthSummary } from './types';

export class DefaultHealthCheckRegistry implements HealthCheckRegistry {
  private checks = new Map<string, HealthCheck>();
  private onStatusEmitter = new Emitter<HealthSummary>();

  get onStatusChanged() { return this.onStatusEmitter.event; }

  register(check: HealthCheck): Disposable {
    this.checks.set(check.name, check);
    return { dispose: () => this.checks.delete(check.name) };
  }

  async runAll(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    for (const [name, check] of this.checks) {
      try {
        const result = await check.check();
        results.push(result);
      } catch (err) {
        results.push({ healthy: false, name, latencyMs: 0, error: (err as Error).message });
      }
    }
    const summary = this.computeSummary(results);
    this.onStatusEmitter.fire(summary);
    return results;
  }

  getStatus(): HealthSummary {
    return { overall: 'healthy', checks: [], lastUpdated: new Date() };
  }

  private computeSummary(results: HealthCheckResult[]): HealthSummary {
    const failed = results.filter(r => !r.healthy).length;
    const total = results.length;
    let overall: 'healthy' | 'degraded' | 'critical';
    if (failed === 0) overall = 'healthy';
    else if (failed <= total * 0.3) overall = 'degraded';
    else overall = 'critical';

    return { overall, checks: results, lastUpdated: new Date() };
  }
}

export class RetryManager {
  async execute<T>(fn: () => Promise<T>, options?: { maxAttempts?: number; baseDelay?: number; maxDelay?: number; jitter?: boolean }): Promise<T> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const baseDelay = options?.baseDelay ?? 1000;
    const maxDelay = options?.maxDelay ?? 10000;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxAttempts) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
          const jitter = options?.jitter ? Math.random() * delay * 0.1 : 0;
          await new Promise(resolve => setTimeout(resolve, delay + jitter));
        }
      }
    }

    throw lastError;
  }
}
