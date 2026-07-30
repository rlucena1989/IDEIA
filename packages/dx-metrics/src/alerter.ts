import { DevExAlert } from './types';
import { createLogger } from '@ideia/logger';
import { DevExMetricCollector } from './collector';
const logger = createLogger('alerter');

const ALERT_RULES = [
  { metric: 'deploy-frequency', threshold: 1, severity: 'warning' as const, message: 'Low deploy frequency' },
  { metric: 'lead-time', threshold: 168, severity: 'critical' as const, message: 'Lead time exceeds 1 week' },
  { metric: 'change-failure-rate', threshold: 0.3, severity: 'critical' as const, message: 'High change failure rate' },
  { metric: 'test-coverage', threshold: 40, severity: 'warning' as const, message: 'Test coverage below 40%' },
  { metric: 'recovery-time', threshold: 1440, severity: 'critical' as const, message: 'Recovery time exceeds 1 day' },
];

export class DevExAlerter {
  private alerts: DevExAlert[] = [];
  private collector: DevExMetricCollector;
  private cooldownMs = 3600000;
  private lastAlert = new Map<string, number>();

  constructor(collector: DevExMetricCollector) { this.collector = collector; }

  evaluate(): DevExAlert[] {
    const newAlerts: DevExAlert[] = [];
    for (const rule of ALERT_RULES) {
      const recent = this.collector.query(rule.metric);
      if (recent.length === 0) continue;
      const latest = recent[recent.length - 1];
      if (latest.value < rule.threshold) {
        const lastTime = this.lastAlert.get(rule.metric) ?? 0;
        if (Date.now() - lastTime > this.cooldownMs) {
          const alert: DevExAlert = { id: `alert-${Date.now()}`, metric: rule.metric, threshold: rule.threshold, actual: latest.value, severity: rule.severity, timestamp: new Date().toISOString(), message: rule.message };
          this.alerts.push(alert);
          this.lastAlert.set(rule.metric, Date.now());
          newAlerts.push(alert);
        }
      }
    }
    return newAlerts;
  }

  getAlerts(): DevExAlert[] { return [...this.alerts]; }
}
