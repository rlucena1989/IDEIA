import { DevExMetric, DORAMetrics } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('collector');

export class DevExMetricCollector {
  private metrics: DevExMetric[] = [];
  private maxMetrics = 10000;

  record(name: string, value: number, unit: string, tags?: Record<string, string>): DevExMetric {
    const metric: DevExMetric = { name, value, unit, timestamp: new Date().toISOString(), tags: tags ?? {} };
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) this.metrics = this.metrics.slice(-this.maxMetrics);
    return metric;
  }

  query(name: string, since?: string): DevExMetric[] {
    let results = this.metrics.filter(m => m.name === name);
    if (since) results = results.filter(m => m.timestamp >= since);
    return results;
  }

  aggregate(name: string, windowMs: number): { avg: number; min: number; max: number; count: number } {
    const cutoff = Date.now() - windowMs;
    const relevant = this.metrics.filter(m => m.name === name && new Date(m.timestamp).getTime() >= cutoff);
    if (relevant.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
    const values = relevant.map(m => m.value);
    return { avg: values.reduce((a, b) => a + b, 0) / values.length, min: Math.min(...values), max: Math.max(...values), count: values.length };
  }

  computeDORA(deployEvents: number, totalLeadTimeHours: number, failures: number, totalDeploys: number, recoveryMinutes: number): DORAMetrics {
    return { deployFrequency: deployEvents / 7, leadTimeHours: totalLeadTimeHours / Math.max(deployEvents, 1), changeFailureRate: failures / Math.max(totalDeploys, 1), recoveryTimeMinutes: recoveryMinutes };
  }

  getStats(): { total: number; unique: number } { return { total: this.metrics.length, unique: new Set(this.metrics.map(m => m.name)).size }; }
}
