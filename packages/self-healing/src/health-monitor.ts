import { createLogger } from '@ideia/logger';
import { HealthMetric, HealthStatus, HealthReport, HealthCheckResult, HealthThreshold } from './types';

const logger = createLogger('self-healing:health-monitor');

export interface HealthCheckExecutor {
  name: string;
  type: 'liveness' | 'readiness' | 'deep' | 'synthetic';
  interval: number;
  timeout: number;
  execute(): Promise<HealthCheckResult>;
}

export class HealthMonitor {
  private _checks: Map<string, HealthCheckExecutor> = new Map();
  private _results: Map<string, HealthCheckResult> = new Map();
  private _timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private _metrics: Map<string, number[]> = new Map();
  private _thresholds: Map<string, HealthThreshold> = new Map();
  private _running: boolean = false;

  register(check: HealthCheckExecutor): void {
    this._checks.set(check.name, check);
  }

  setThreshold(metricName: string, threshold: HealthThreshold): void {
    this._thresholds.set(metricName, threshold);
  }

  recordMetric(name: string, value: number): void {
    if (!this._metrics.has(name)) {
      this._metrics.set(name, []);
    }
    const series = this._metrics.get(name) as number[];
    series.push(value);
    if (series.length > 1000) {
      series.splice(0, series.length - 1000);
    }
  }

  getMetricSeries(name: string): readonly number[] {
    return this._metrics.get(name) ?? [];
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    for (const check of this._checks.values()) {
      this._runCheck(check);
      const timer = setInterval(() => this._runCheck(check), check.interval);
      this._timers.set(check.name, timer);
    }
  }

  stop(): void {
    this._running = false;
    for (const timer of this._timers.values()) {
      clearInterval(timer);
    }
    this._timers.clear();
  }

  get isRunning(): boolean {
    return this._running;
  }

  async getStatus(type?: 'liveness' | 'readiness' | 'deep' | 'synthetic'): Promise<{ overall: HealthStatus; checks: HealthCheckResult[] }> {
    const allResults = Array.from(this._results.values());
    const filtered = type ? allResults.filter(r => r.type === type) : allResults;
    const statuses = filtered.map(r => r.status);
    const overall: HealthStatus =
      statuses.some(s => s === 'unhealthy') ? 'unhealthy'
      : statuses.some(s => s === 'degraded') ? 'degraded'
      : 'healthy';
    return { overall, checks: filtered };
  }

  async getReport(): Promise<HealthReport> {
    const { overall, checks } = await this.getStatus();
    const metrics: HealthMetric[] = [];
    const now = Date.now();
    for (const [name, series] of this._metrics) {
      if (series.length === 0) continue;
      const current = series[series.length - 1] as number;
      const baseline = series.reduce((a, b) => a + b, 0) / series.length;
      const threshold = this._thresholds.get(name) ?? { warning: 0.8, critical: 0.95, direction: 'above' };
      metrics.push({ name, value: current, baseline, threshold, timestamp: now, tags: {} });
    }
    return { overall, metrics, checks, timestamp: now, summary: `Health status: ${overall}` };
  }

  getMetricsSnapshot(): Record<string, number> {
    const snapshot: Record<string, number> = {};
    for (const [name, series] of this._metrics) {
      if (series.length > 0) {
        snapshot[name] = series[series.length - 1] as number;
      }
    }
    return snapshot;
  }

  private async _runCheck(check: HealthCheckExecutor): Promise<void> {
    try {
      const result = await check.execute();
      this._results.set(check.name, result);
      this.recordMetric(`${check.name}_latency`, result.latency);
      if (result.status !== 'healthy') {
        this.recordMetric(`${check.name}_status`, result.status === 'degraded' ? 0.5 : 0);
      }
    } catch (error: unknown) {
      const failed: HealthCheckResult = {
        name: check.name,
        type: check.type,
        status: 'unhealthy',
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
      this._results.set(check.name, failed);
    }
  }
}
