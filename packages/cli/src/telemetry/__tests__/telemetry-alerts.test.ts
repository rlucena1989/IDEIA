import { describe, it, expect } from '@jest/globals';
import { detectTelemetryAlerts, acknowledgeAlert } from '../telemetry-alerts';
import { createTelemetryEvent } from '../telemetry-types';

describe('telemetry-alerts', () => {
  it('should return empty for clean events', () => {
    const alerts = detectTelemetryAlerts([]);
    expect(alerts.length).toBe(0);
  });

  it('should detect critical alerts', () => {
    const events = [
      createTelemetryEvent({ name: 'critical', severity: 'critical', source: 't', requestId: 'r1' }),
    ];
    const alerts = detectTelemetryAlerts(events);
    expect(alerts.some(a => a.alertId === 'alert-critical-events')).toBe(true);
  });

  it('should detect error spike with 3+ errors', () => {
    const events = [
      createTelemetryEvent({ name: 'e1', severity: 'error', source: 't', requestId: 'r1' }),
      createTelemetryEvent({ name: 'e2', severity: 'error', source: 't', requestId: 'r2' }),
      createTelemetryEvent({ name: 'e3', severity: 'error', source: 't', requestId: 'r3' }),
    ];
    const alerts = detectTelemetryAlerts(events);
    expect(alerts.some(a => a.alertId === 'alert-error-spike')).toBe(true);
  });

  it('acknowledgeAlert should set acknowledged to true', () => {
    const alerts = detectTelemetryAlerts([
      createTelemetryEvent({ name: 'c', severity: 'critical', source: 't', requestId: 'r1' }),
    ]);
    const acked = acknowledgeAlert(alerts[0]);
    expect(acked.acknowledged).toBe(true);
  });
});
