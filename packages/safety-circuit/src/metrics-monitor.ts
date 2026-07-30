import { MetricsStore } from '@ideia/metrics-store';
import { createLogger } from '@ideia/logger';
const logger = createLogger('metrics-monitor');

export interface AnomalyAlert {
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  timestamp: number;
}

export class MetricsMonitor {
  private metricsStore: MetricsStore;
  private baselines: Map<string, number> = new Map();
  private alerts: AnomalyAlert[] = [];

  constructor(metricsStore: MetricsStore) {
    this.metricsStore = metricsStore;
  }

  async watch(): Promise<AnomalyAlert[]> {
    const newAlerts: AnomalyAlert[] = [];
    const categories = ['throughput', 'error-rate', 'latency', 'memory'];

    for (const category of categories) {
      const entries = await this.metricsStore.query(category);
      if (entries.length === 0) continue;

      const avg = entries.reduce((sum, e) => sum + e.value, 0) / entries.length;
      const baseline = this.baselines.get(category) ?? avg;

      this.baselines.set(category, baseline);

      const deviation = baseline > 0 ? Math.abs(avg - baseline) / baseline : 0;
      if (deviation > 0.2) {
        const alert: AnomalyAlert = {
          metric: category,
          value: avg,
          expected: baseline,
          deviation,
          timestamp: Date.now(),
        };
        newAlerts.push(alert);
        this.alerts.push(alert);
      }
    }

    return newAlerts;
  }

  getAlerts(): AnomalyAlert[] {
    return [...this.alerts];
  }

  resetBaselines(): void {
    this.baselines.clear();
  }
}

export function createMetricsMonitor(metricsStore: MetricsStore): MetricsMonitor {
  return new MetricsMonitor(metricsStore);
}
