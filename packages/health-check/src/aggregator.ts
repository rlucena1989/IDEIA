import { HealthChecker, ComponentHealth, HealthCheckResult, HealthStatus, HealthCheckOptions } from './types';
import { createLogger } from '@ideia/logger';
import { SystemChecker, ProcessChecker } from './system';

export class HealthCheckAggregator {
  private checkers: Map<string, HealthChecker> = new Map();
  private startTime: number = Date.now();

  constructor(private options: HealthCheckOptions = {}) {
    if (options.includeSystem !== false) {
      this.register(new SystemChecker());
      this.register(new ProcessChecker());
    }
  }

  register(checker: HealthChecker): void {
    this.checkers.set(checker.name, checker);
  }

  unregister(name: string): void {
    this.checkers.delete(name);
  }

  getRegistered(): string[] {
    return [...this.checkers.keys()];
  }

  async check(): Promise<HealthCheckResult> {
    const entries = await Promise.all(
      [...this.checkers.values()].map(async (checker) => {
        const start = Date.now();
        try {
          const result = await checker.check();
          result.latency = Date.now() - start;
          return result;
        } catch (_err) {
          return {
            name: checker.name,
            status: 'unhealthy' as HealthStatus,
            message: `Error: ${_err instanceof Error ? _err.message : String(_err)}`,
            latency: Date.now() - start,
          } as ComponentHealth;
        }
      })
    );

    const status = this.calculateOverallStatus(entries);

    return {
      status,
      timestamp: new Date().toISOString(),
      version: this.options.version || '0.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: entries,
    };
  }

  private calculateOverallStatus(checks: ComponentHealth[]): HealthStatus {
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }
}

export function createAggregator(options?: HealthCheckOptions): HealthCheckAggregator {
  return new HealthCheckAggregator(options);
}
