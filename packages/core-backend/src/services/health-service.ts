import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
const logger = createLogger('health-service');

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface HealthStatus {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheckResult[];
  timestamp: string;
}

export class HealthService {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private onHealthChangedEmitter = new Emitter<HealthStatus>();

  get onHealthChanged() {
    return this.onHealthChangedEmitter.event;
  }

  registerCheck(name: string, checkFn: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, checkFn);
  }

  unregisterCheck(name: string): void {
    this.checks.delete(name);
  }

  async checkHealth(): Promise<HealthStatus> {
    const results: HealthCheckResult[] = [];
    
    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        results.push(result);
      } catch (error) {
        results.push({
          service: name,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          details: { error: String(error) },
        });
      }
    }

    const overall = this.determineOverallStatus(results);
    const status: HealthStatus = {
      overall,
      checks: results,
      timestamp: new Date().toISOString(),
    };

    this.onHealthChangedEmitter.fire(status);
    return status;
  }

  private determineOverallStatus(results: HealthCheckResult[]): 'healthy' | 'unhealthy' | 'degraded' {
    if (results.length === 0) return 'healthy';
    
    const hasUnhealthy = results.some(r => r.status === 'unhealthy');
    const hasDegraded = results.some(r => r.status === 'degraded');
    
    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }
}

export function createHealthService(): HealthService {
  return new HealthService();
}
