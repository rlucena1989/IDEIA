import { createLogger } from '@ideia/logger';
import { NatsMetrics, SLODefinition, SLOStatus } from './types';

const DEFAULT_SLOS: SLODefinition[] = [
  { name: 'latency_p99', target: 50, severity: 'critical', window: 300000, burnRate: 2 },
  { name: 'throughput_min', target: 1000, severity: 'warning', window: 60000, burnRate: 3 },
  { name: 'dlq_rate', target: 1, severity: 'critical', window: 900000, burnRate: 1.5 },
  { name: 'consumer_lag', target: 0, severity: 'warning', window: 60000, burnRate: 2 },
  { name: 'stream_healthy', target: 100, severity: 'critical', window: 3600000, burnRate: 1 },
];

export class SloMonitor {
  private logger = createLogger('observability:slo-monitor');

  constructor(
    private readonly slos: SLODefinition[] = DEFAULT_SLOS
  ) {}

  checkSLOs(metrics: NatsMetrics): SLOStatus[] {
    this.logger.debug('checking SLOs', { sloCount: this.slos.length });

    return this.slos.map((slo) => {
      const actual = this.extractMetricValue(metrics, slo.name);
      const compliant = this.evaluateCompliance(slo.name, actual, slo.target);
      const burnRate = this.calculateBurnRate(slo, actual);

      return {
        name: slo.name,
        target: slo.target,
        actual,
        compliant,
        burnRate,
      };
    });
  }

  private extractMetricValue(metrics: NatsMetrics, sloName: string): number {
    switch (sloName) {
      case 'latency_p99':
        return metrics.latency.p99;
      case 'throughput_min':
        return metrics.throughput.messagesPerSecond;
      case 'dlq_rate':
        return metrics.dlq.dlqRate;
      case 'consumer_lag':
        return metrics.consumers.withLag;
      case 'stream_healthy':
        return metrics.health.healthy ? 100 : 0;
      default:
        return 0;
    }
  }

  private evaluateCompliance(sloName: string, actual: number, target: number): boolean {
    switch (sloName) {
      case 'latency_p99':
      case 'dlq_rate':
        return actual <= target;
      case 'throughput_min':
        return actual >= target;
      case 'consumer_lag':
        return actual <= target;
      case 'stream_healthy':
        return actual >= target;
      default:
        return false;
    }
  }

  calculateBurnRate(slo: SLODefinition, actual: number): number {
    if (slo.target === 0) {
      return actual === 0 ? 0 : 99;
    }
    const ratio = actual / slo.target;
    return Math.round(ratio * 100) / 100;
  }
}
