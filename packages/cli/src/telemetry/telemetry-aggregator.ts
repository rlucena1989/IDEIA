import { TelemetryEvent, TelemetryMetric } from './telemetry-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('telemetry-aggregator');

export function aggregateTelemetry(events: TelemetryEvent[]): TelemetryMetric[] {
  const total = events.length;
  const debugCount = events.filter(e => e.severity === 'debug').length;
  const infoCount = events.filter(e => e.severity === 'info').length;
  const warnings = events.filter(e => e.severity === 'warning').length;
  const errors = events.filter(e => e.severity === 'error' || e.severity === 'critical').length;
  const critical = events.filter(e => e.severity === 'critical').length;

  return [
    {
      metricId: 'metric-total-events',
      name: 'total_events', value: total, unit: 'count',
      collectedAt: new Date().toISOString(), labels: {},
    },
    {
      metricId: 'metric-debug-events',
      name: 'debug_events', value: debugCount, unit: 'count',
      collectedAt: new Date().toISOString(), labels: {},
    },
    {
      metricId: 'metric-info-events',
      name: 'info_events', value: infoCount, unit: 'count',
      collectedAt: new Date().toISOString(), labels: {},
    },
    {
      metricId: 'metric-warning-events',
      name: 'warning_events', value: warnings, unit: 'count',
      collectedAt: new Date().toISOString(), labels: {},
    },
    {
      metricId: 'metric-error-events',
      name: 'error_events', value: errors, unit: 'count',
      collectedAt: new Date().toISOString(), labels: {},
    },
    {
      metricId: 'metric-critical-events',
      name: 'critical_events', value: critical, unit: 'count',
      collectedAt: new Date().toISOString(), labels: {},
    },
  ];
}
