import { createLogger, Logger } from '@ideia/logger';
import { MetricsStore } from '@ideia/metrics-store';
import { MetricsBottleneck } from './types';

export { MetricsBottleneck };

interface ProcessMetrics {
  cpuPercent: number;
  memoryRssMb: number;
  heapUsedMb: number;
  eventLoopLagMs: number;
  activeHandles: number;
  activeRequests: number;
}

const DEFAULT_THRESHOLDS: Record<string, { warning: number; critical: number }> = {
  cpuPercent: { warning: 70, critical: 90 },
  memoryRssMb: { warning: 512, critical: 1024 },
  heapUsedMb: { warning: 256, critical: 512 },
  eventLoopLagMs: { warning: 100, critical: 500 },
  activeHandles: { warning: 200, critical: 500 },
};

export class MetricsScanner {
  private logger: Logger;
  private metricsStore: MetricsStore;
  private thresholds: Record<string, { warning: number; critical: number }>;

  constructor(metricsStore: MetricsStore, logger?: Logger, thresholds?: Record<string, { warning: number; critical: number }>) {
    this.metricsStore = metricsStore;
    this.logger = logger ?? createLogger('metrics-scanner');
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  async scanPerformanceMetrics(): Promise<MetricsBottleneck[]> {
    const bottlenecks: MetricsBottleneck[] = [];
    const current = await this.captureProcessMetrics();

    for (const [metric, value] of Object.entries(current)) {
      const threshold = this.thresholds[metric];
      if (!threshold) continue;

      const numericValue = value as number;

      if (numericValue >= threshold.critical) {
        bottlenecks.push({
          metric,
          severity: 'critical',
          currentValue: numericValue,
          thresholdValue: threshold.critical,
          recommendation: `Reduce ${metric} from ${numericValue.toFixed(1)} to below ${threshold.critical}`,
          category: 'performance',
        });
      } else if (numericValue >= threshold.warning) {
        bottlenecks.push({
          metric,
          severity: 'high',
          currentValue: numericValue,
          thresholdValue: threshold.warning,
          recommendation: `Monitor ${metric}: ${numericValue.toFixed(1)} exceeds warning threshold ${threshold.warning}`,
          category: 'performance',
        });
      }
    }

    const storeBottlenecks = await this.scanStoreLatency();
    bottlenecks.push(...storeBottlenecks);

    await this.metricsStore.record('scanner', 'bottlenecks_found', bottlenecks.length, {
      critical: String(bottlenecks.filter(b => b.severity === 'critical').length),
    });

    this.logger.info(`Performance scan: ${bottlenecks.length} bottlenecks (${bottlenecks.filter(b => b.severity === 'critical').length} critical)`);
    return bottlenecks;
  }

  private async captureProcessMetrics(): Promise<ProcessMetrics> {
    const mem = process.memoryUsage();
    const cpuPercent = await this.getCpuUsage();
    const eventLoopLagMs = await this.measureEventLoopLag();

    return {
      cpuPercent,
      memoryRssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      eventLoopLagMs,
      activeHandles: (process as unknown as { _getActiveHandles: () => unknown[] })._getActiveHandles().length,
      activeRequests: (process as unknown as { _getActiveRequests: () => unknown[] })._getActiveRequests().length,
    };
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise(resolve => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const elapsedMs = Date.now() - startTime;
        const cpuMicros = endUsage.user + endUsage.system;
        const percent = Math.round((cpuMicros / 1000 / elapsedMs) * 100 * 100) / 100;
        resolve(Math.min(100, percent));
      }, 100);
    });
  }

  private async measureEventLoopLag(): Promise<number> {
    return new Promise(resolve => {
      const start = Date.now();
      setImmediate(() => {
        resolve(Date.now() - start);
      });
    });
  }

  private async scanStoreLatency(): Promise<MetricsBottleneck[]> {
    const bottlenecks: MetricsBottleneck[] = [];
    const categories = ['evolution', 'scanner', 'health'];

    for (const category of categories) {
      try {
        const trend = await this.metricsStore.getTrend(category, 'latency', 300000);
        if (trend.values.length > 0) {
          const avgLatency = trend.avg;
          if (avgLatency > 1000) {
            bottlenecks.push({
              metric: `store.latency.${category}`,
              severity: avgLatency > 5000 ? 'critical' : 'high',
              currentValue: avgLatency,
              thresholdValue: 1000,
              recommendation: `High store latency for ${category}: ${avgLatency.toFixed(0)}ms avg`,
              category: 'storage',
            });
          }
        }
      } catch {
        /* skip unavailable categories */
      }
    }

    return bottlenecks;
  }
}
