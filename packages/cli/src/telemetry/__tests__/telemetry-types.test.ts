import { createTelemetryEvent } from '../telemetry-types';
import type { TelemetryEvent, TelemetryMetric, TelemetryAlert } from '../telemetry-types';

describe('createTelemetryEvent', () => {
  it('creates an event with required fields', () => {
    const event = createTelemetryEvent({
      name: 'test.event',
      severity: 'info',
      source: 'cli',
      requestId: 'req-001',
    });
    expect(event.eventId).toBeDefined();
    expect(event.name).toBe('test.event');
    expect(event.severity).toBe('info');
    expect(event.timestamp).toBeDefined();
    expect(event.tags).toEqual([]);
  });

  it('accepts all severity levels', () => {
    const severities: TelemetryEvent['severity'][] = ['debug', 'info', 'warning', 'error', 'critical'];
    for (const severity of severities) {
      const event = createTelemetryEvent({ name: 't', severity, source: 's', requestId: 'r' });
      expect(event.severity).toBe(severity);
    }
  });

  it('sets optional correlationId', () => {
    const event = createTelemetryEvent({
      name: 't', severity: 'info', source: 's', requestId: 'r', correlationId: 'corr-1',
    });
    expect(event.correlationId).toBe('corr-1');
  });

  it('sets optional tags', () => {
    const event = createTelemetryEvent({
      name: 't', severity: 'info', source: 's', requestId: 'r', tags: ['test', 'debug'],
    });
    expect(event.tags).toEqual(['test', 'debug']);
  });

  it('sets optional payload', () => {
    const event = createTelemetryEvent({
      name: 't', severity: 'info', source: 's', requestId: 'r', payload: { count: 42, active: true },
    });
    expect(event.payload!.count).toBe(42);
    expect(event.payload!.active).toBe(true);
  });

  it('generates unique event IDs', () => {
    const e1 = createTelemetryEvent({ name: 't', severity: 'info', source: 's', requestId: 'r' });
    const e2 = createTelemetryEvent({ name: 't', severity: 'info', source: 's', requestId: 'r' });
    expect(e1.eventId).not.toBe(e2.eventId);
  });
});

describe('TelemetryMetric type', () => {
  it('constructs a metric', () => {
    const metric: TelemetryMetric = {
      metricId: 'm1',
      name: 'response_time',
      value: 150,
      unit: 'ms',
      collectedAt: new Date().toISOString(),
      labels: { host: 'server-1' },
    };
    expect(metric.value).toBe(150);
    expect(metric.labels.host).toBe('server-1');
  });
});

describe('TelemetryAlert type', () => {
  it('constructs an alert', () => {
    const alert: TelemetryAlert = {
      alertId: 'a1',
      name: 'high_error_rate',
      severity: 'critical',
      reason: 'Error rate above 10%',
      createdAt: new Date().toISOString(),
      acknowledged: false,
    };
    expect(alert.severity).toBe('critical');
    expect(alert.acknowledged).toBe(false);
  });
});
