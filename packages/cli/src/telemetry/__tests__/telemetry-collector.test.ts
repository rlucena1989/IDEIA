import { describe, it, expect } from '@jest/globals';
import { TelemetryCollector } from '../telemetry-collector';
import { createTelemetryEvent } from '../telemetry-types';

describe('telemetry-collector', () => {
  it('should record and list events', () => {
    const c = new TelemetryCollector();
    const e = createTelemetryEvent({ name: 'test', severity: 'info', source: 'test', requestId: 'r1' });
    c.record(e);
    expect(c.list().length).toBe(1);
    expect(c.count()).toBe(1);
  });

  it('should filter by severity', () => {
    const c = new TelemetryCollector();
    c.record(createTelemetryEvent({ name: 'a', severity: 'info', source: 't', requestId: 'r1' }));
    c.record(createTelemetryEvent({ name: 'b', severity: 'error', source: 't', requestId: 'r2' }));
    c.record(createTelemetryEvent({ name: 'c', severity: 'error', source: 't', requestId: 'r3' }));
    expect(c.filterBySeverity('error').length).toBe(2);
    expect(c.filterBySeverity('info').length).toBe(1);
  });

  it('should clear events', () => {
    const c = new TelemetryCollector();
    c.record(createTelemetryEvent({ name: 'a', severity: 'info', source: 't', requestId: 'r1' }));
    c.clear();
    expect(c.count()).toBe(0);
  });
});
