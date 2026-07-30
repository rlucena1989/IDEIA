import { createLogger } from '@ideia/logger';
import { NatsMetrics, AlertRule, Alert, MetricOperator } from './types';

let alertCounter = 0;

function generateAlertId(): string {
  alertCounter++;
  return `alert-${Date.now()}-${alertCounter}`;
}

const DEFAULT_RULES: AlertRule[] = [
  { metric: 'latency_p99', operator: 'gt', threshold: 50, severity: 'critical', cooldown: 300000 },
  { metric: 'latency_p95', operator: 'gt', threshold: 100, severity: 'warning', cooldown: 300000 },
  { metric: 'dlq_rate', operator: 'gt', threshold: 1, severity: 'critical', cooldown: 600000 },
  { metric: 'consumer_lag', operator: 'gt', threshold: 0, severity: 'warning', cooldown: 120000 },
  { metric: 'health_healthy', operator: 'eq', threshold: 0, severity: 'critical', cooldown: 60000 },
];

export class AlertManager {
  private alerts: Alert[] = [];
  private lastFired: Map<string, number> = new Map();
  private logger = createLogger('observability:alert-manager');

  constructor(
    private readonly rules: AlertRule[] = DEFAULT_RULES
  ) {}

  evaluateRules(metrics: NatsMetrics): Alert[] {
    const fired: Alert[] = [];

    for (const rule of this.rules) {
      const value = this.extractMetricValue(metrics, rule.metric);
      const triggered = this.evaluateCondition(value, rule.operator, rule.threshold);

      if (triggered) {
        const cooldownKey = `${rule.metric}:${rule.severity}`;
        const lastFiredAt = this.lastFired.get(cooldownKey) ?? 0;
        const now = Date.now();

        if (now - lastFiredAt >= rule.cooldown) {
          const alert: Alert = {
            id: generateAlertId(),
            rule: rule.metric,
            message: `${rule.metric} is ${value} (threshold: ${rule.threshold})`,
            severity: rule.severity,
            timestamp: now,
            acknowledged: false,
            resolved: false,
          };

          this.alerts.push(alert);
          this.lastFired.set(cooldownKey, now);
          fired.push(alert);

          this.logger.warn('alert fired', { metric: rule.metric, value, threshold: rule.threshold, severity: rule.severity });
        }
      }
    }

    return fired;
  }

  private extractMetricValue(metrics: NatsMetrics, metricName: string): number {
    switch (metricName) {
      case 'latency_p50': return metrics.latency.p50;
      case 'latency_p90': return metrics.latency.p90;
      case 'latency_p95': return metrics.latency.p95;
      case 'latency_p99': return metrics.latency.p99;
      case 'latency_p999': return metrics.latency.p999;
      case 'throughput_msgs': return metrics.throughput.messagesPerSecond;
      case 'throughput_bytes': return metrics.throughput.bytesPerSecond;
      case 'dlq_size': return metrics.dlq.size;
      case 'dlq_rate': return metrics.dlq.dlqRate;
      case 'consumer_lag': return metrics.consumers.withLag;
      case 'consumer_pending': return metrics.consumers.totalPending;
      case 'health_healthy': return metrics.health.healthy ? 1 : 0;
      default: return 0;
    }
  }

  private evaluateCondition(value: number, operator: MetricOperator, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert == null) return false;

    alert.acknowledged = true;
    this.logger.info('alert acknowledged', { alertId });
    return true;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert == null) return false;

    alert.resolved = true;
    this.logger.info('alert resolved', { alertId });
    return true;
  }

  getAlerts(): Alert[] {
    return this.alerts;
  }

  getPendingAlerts(): Alert[] {
    return this.alerts.filter((a) => !a.acknowledged && !a.resolved);
  }
}
