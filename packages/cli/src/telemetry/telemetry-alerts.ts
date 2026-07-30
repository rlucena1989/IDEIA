import { TelemetryAlert, TelemetryEvent } from './telemetry-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('telemetry-alerts');

export function detectTelemetryAlerts(events: TelemetryEvent[]): TelemetryAlert[] {
  const criticalCount = events.filter(e => e.severity === 'critical').length;
  const errorCount = events.filter(e => e.severity === 'error').length;
  const warningCount = events.filter(e => e.severity === 'warning').length;

  const alerts: TelemetryAlert[] = [];

  if (criticalCount > 0) {
    alerts.push({
      alertId: 'alert-critical-events',
      name: 'critical_events_detected',
      severity: 'critical',
      reason: 'Critical telemetry events were observed.',
      createdAt: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (errorCount >= 3) {
    alerts.push({
      alertId: 'alert-error-spike',
      name: 'error_spike',
      severity: 'warning',
      reason: 'Error volume above threshold (>=3).',
      createdAt: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (warningCount >= 5) {
    alerts.push({
      alertId: 'alert-warning-threshold',
      name: 'warning_threshold_exceeded',
      severity: 'warning',
      reason: 'Warning volume above threshold (>=5).',
      createdAt: new Date().toISOString(),
      acknowledged: false,
    });
  }

  return alerts;
}

export function acknowledgeAlert(alert: TelemetryAlert): TelemetryAlert {
  return { ...alert, acknowledged: true };
}
