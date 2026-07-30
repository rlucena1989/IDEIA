import { buildTelemetryReport } from '../telemetry-report';
import type { TelemetryEvent, TelemetryMetric, TelemetryAlert } from '../telemetry-types';
import type { TraceSpan } from '../telemetry-tracer';

describe('buildTelemetryReport', () => {
  const mockEvent: TelemetryEvent = {
    eventId: 'e1', name: 'test', timestamp: new Date().toISOString(),
    severity: 'info', source: 'cli', requestId: 'r1', tags: [],
  };
  const mockMetric: TelemetryMetric = {
    metricId: 'm1', name: 'latency', value: 100, unit: 'ms',
    collectedAt: new Date().toISOString(), labels: {},
  };
  const mockAlert: TelemetryAlert = {
    alertId: 'a1', name: 'error_spike', severity: 'warning',
    reason: 'Spike detected', createdAt: new Date().toISOString(), acknowledged: false,
  };
  const mockSpan: TraceSpan = {
    spanId: 's1', traceId: 't1', name: 'operation', startTime: Date.now(),
    endTime: Date.now() + 100, status: 'ok', attributes: {},
  };

  it('builds report with all fields', () => {
    const report = buildTelemetryReport({
      events: [mockEvent],
      metrics: [mockMetric],
      alerts: [mockAlert],
      spans: [mockSpan],
    });
    expect(report.generatedAt).toBeDefined();
    expect(report.totalEvents).toBe(1);
    expect(report.metrics).toHaveLength(1);
    expect(report.alerts).toHaveLength(1);
    expect(report.spans).toHaveLength(1);
  });

  it('generates summary lines', () => {
    const report = buildTelemetryReport({
      events: [mockEvent, mockEvent],
      metrics: [mockMetric],
      alerts: [],
      spans: [],
    });
    expect(report.summary[0]).toContain('2 evento(s)');
    expect(report.summary[1]).toContain('1 métrica(s)');
    expect(report.summary[2]).toContain('0 alerta(s)');
    expect(report.summary[3]).toContain('0 span(s)');
  });

  it('handles empty arrays', () => {
    const report = buildTelemetryReport({ events: [], metrics: [], alerts: [], spans: [] });
    expect(report.totalEvents).toBe(0);
    expect(report.summary).toHaveLength(4);
  });
});
