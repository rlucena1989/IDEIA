import { describe, it, expect } from '@jest/globals';
import { aggregateTelemetry } from '../telemetry-aggregator';
import { createTelemetryEvent } from '../telemetry-types';

describe('telemetry-aggregator', () => {
  it('should aggregate empty events', () => {
    const metrics = aggregateTelemetry([]);
    expect(metrics.length).toBe(6);
    expect(metrics.find(m => m.name === 'total_events')?.value).toBe(0);
  });

  it('should count severities correctly', () => {
    const events = [
      createTelemetryEvent({ name: 'a', severity: 'info', source: 't', requestId: 'r1' }),
      createTelemetryEvent({ name: 'b', severity: 'warning', source: 't', requestId: 'r2' }),
      createTelemetryEvent({ name: 'c', severity: 'error', source: 't', requestId: 'r3' }),
      createTelemetryEvent({ name: 'd', severity: 'critical', source: 't', requestId: 'r4' }),
    ];
    const metrics = aggregateTelemetry(events);
    expect(metrics.find(m => m.name === 'total_events')?.value).toBe(4);
    expect(metrics.find(m => m.name === 'warning_events')?.value).toBe(1);
    expect(metrics.find(m => m.name === 'error_events')?.value).toBe(2);
    expect(metrics.find(m => m.name === 'critical_events')?.value).toBe(1);
  });
});
