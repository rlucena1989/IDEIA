import { createLogger, Logger } from '@ideia/logger';

export type SLOStatus = 'pass' | 'warning' | 'fail';

export interface SLODefinition {
  name: string;
  target: number;
  windowMs: number;
  description?: string;
}

export interface SLOState {
  definition: SLODefinition;
  currentValue: number;
  status: SLOStatus;
  errorBudget: number;
  errorBudgetUsed: number;
  dataPoints: number;
  lastUpdated: string;
}

export interface BurnRate {
  metric: string;
  windowMs: number;
  burnRate: number;
  projectedExhaustionMs: number;
  status: SLOStatus;
}

const log = createLogger('slo-monitor');

export class SLOMonitor {
  private slos: Map<string, SLODefinition> = new Map();
  private data: Map<string, number[]> = new Map();
  private timestamps: Map<string, number[]> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? log;
  }

  defineSLO(name: string, target: number, windowMs: number, description?: string): void {
    this.slos.set(name, { name, target, windowMs, description });
    if (!this.data.has(name)) this.data.set(name, []);
    if (!this.timestamps.has(name)) this.timestamps.set(name, []);
    this.logger.info(`SLO defined: ${name} (target: ${target}, window: ${windowMs}ms)`);
  }

  record(metric: string, value: number): void {
    const now = Date.now();
    if (!this.data.has(metric)) this.data.set(metric, []);
    if (!this.timestamps.has(metric)) this.timestamps.set(metric, []);

    const values = this.data.get(metric)!;
    const times = this.timestamps.get(metric)!;
    values.push(value);
    times.push(now);

    const slo = this.slos.get(metric);
    if (slo) {
      const cutoff = now - slo.windowMs;
      while (times.length > 0 && (times[0] ?? 0) < cutoff) {
        times.shift();
        values.shift();
      }
    }

    if (values.length > 10000) {
      values.splice(0, values.length - 10000);
      times.splice(0, times.length - 10000);
    }
  }

  check(metric: string): { status: SLOStatus; slo: SLODefinition | undefined; value: number; errorBudget: number; errorBudgetUsed: number } {
    const slo = this.slos.get(metric);
    const values = this.data.get(metric) ?? [];
    const times = this.timestamps.get(metric) ?? [];

    if (!slo || values.length === 0) {
      return { status: 'pass', slo, value: 0, errorBudget: 1, errorBudgetUsed: 0 };
    }

    const cutoff = Date.now() - slo.windowMs;
    const recent: number[] = [];
    for (let i = 0; i < times.length; i++) {
      if ((times[i] ?? 0) >= cutoff) recent.push(values[i] ?? 0);
    }

    if (recent.length === 0) {
      return { status: 'pass', slo, value: 0, errorBudget: 1, errorBudgetUsed: 0 };
    }

    const goodCount = recent.filter(v => v >= slo.target).length;
    const currentValue = goodCount / recent.length;
    const errorBudget = 1 - slo.target;
    const errorRate = 1 - currentValue;
    const errorBudgetUsed = errorBudget > 0 ? Math.min(1, errorRate / errorBudget) : 1;

    let status: SLOStatus = 'pass';
    if (errorBudgetUsed >= 1) status = 'fail';
    else if (errorBudgetUsed >= 0.8) status = 'warning';

    return { status, slo, value: currentValue, errorBudget, errorBudgetUsed };
  }

  getSLODashboard(): Array<{ name: string; target: number; currentValue: number; status: SLOStatus; errorBudget: number; errorBudgetUsed: number; dataPoints: number; lastUpdated: string }> {
    const dashboard: Array<{ name: string; target: number; currentValue: number; status: SLOStatus; errorBudget: number; errorBudgetUsed: number; dataPoints: number; lastUpdated: string }> = [];

    for (const [name, slo] of this.slos) {
      const result = this.check(name);
      const values = this.data.get(name) ?? [];
      dashboard.push({
        name,
        target: slo.target,
        currentValue: result.value,
        status: result.status,
        errorBudget: result.errorBudget,
        errorBudgetUsed: result.errorBudgetUsed,
        dataPoints: values.length,
        lastUpdated: values.length > 0 ? new Date().toISOString() : 'never',
      });
    }

    return dashboard;
  }

  getBurnRate(metric: string, windowMs: number): BurnRate {
    const slo = this.slos.get(metric);
    const values = this.data.get(metric) ?? [];
    const times = this.timestamps.get(metric) ?? [];

    const cutoff = Date.now() - windowMs;
    const recent: number[] = [];
    for (let i = 0; i < times.length; i++) {
      if ((times[i] ?? 0) >= cutoff) recent.push(values[i] ?? 0);
    }

    const target = slo?.target ?? 0.99;
    if (recent.length === 0) {
      return { metric, windowMs, burnRate: 0, projectedExhaustionMs: Infinity, status: 'pass' };
    }

    const goodCount = recent.filter(v => v >= target).length;
    const currentValue = goodCount / recent.length;
    const errorRate = 1 - currentValue;
    const allowedErrorRate = 1 - target;
    const burnRate = allowedErrorRate > 0 ? errorRate / allowedErrorRate : 1;

    const projectedExhaustionMs = burnRate > 0 ? windowMs / burnRate : Infinity;

    let status: SLOStatus = 'pass';
    if (burnRate >= 1) status = 'fail';
    else if (burnRate >= 0.8) status = 'warning';

    return { metric, windowMs, burnRate, projectedExhaustionMs, status };
  }

  listSLOs(): SLODefinition[] {
    return Array.from(this.slos.values());
  }

  clear(): void {
    this.data.clear();
    this.timestamps.clear();
  }
}

export function createDefaultSLOs(monitor: SLOMonitor): void {
  monitor.defineSLO('uptime', 0.999, 24 * 60 * 60 * 1000, 'Service uptime ≥ 99.9%');
  monitor.defineSLO('latency_p95', 0.95, 60 * 60 * 1000, 'Latency P95 < 500ms');
  monitor.defineSLO('throughput', 1000, 60 * 1000, 'Throughput ≥ 1000 rpm');
}

export function createSLOMonitor(logger?: Logger): SLOMonitor {
  return new SLOMonitor(logger);
}
