import { describe, it, expect } from '@jest/globals';
import { TelemetryTracer } from '../telemetry-tracer';

describe('telemetry-tracer', () => {
  it('should start and list spans', () => {
    const t = new TelemetryTracer();
    t.startSpan('req-1', 'test-span');
    expect(t.listSpans().length).toBe(1);
  });

  it('should end span with status', () => {
    const t = new TelemetryTracer();
    const span = t.startSpan('req-1', 'test');
    t.endSpan(span.spanId, 'ok', 150);
    const ended = t.getSpan(span.spanId);
    expect(ended?.status).toBe('ok');
    expect(ended?.durationMs).toBe(150);
    expect(ended?.endedAt).toBeDefined();
  });

  it('should not fail ending unknown span', () => {
    const t = new TelemetryTracer();
    t.endSpan('unknown', 'error', 0);
    expect(t.listSpans().length).toBe(0);
  });

  it('should clear spans', () => {
    const t = new TelemetryTracer();
    t.startSpan('r1', 's1');
    t.clear();
    expect(t.listSpans().length).toBe(0);
  });
});
