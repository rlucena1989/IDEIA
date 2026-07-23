import { ObservabilityEngine, Tracer } from '../src/observability-engine';

describe('Tracer', () => {
  it('should start and end spans', () => {
    const t = new Tracer();
    const span = t.startSpan('test');
    expect(span.spanId).toBeTruthy();
    expect(span.name).toBe('test');
    t.endSpan(span.spanId);
    expect(span.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should maintain parent-child relationships', () => {
    const t = new Tracer();
    const parent = t.startSpan('parent');
    const child = t.startSpan('child');
    expect(child.parentSpanId).toBe(parent.spanId);
    t.endSpan(child.spanId);
    t.endSpan(parent.spanId);
  });

  it('should trace synchronous functions', () => {
    const t = new Tracer();
    const result = t.trace('compute', () => 42);
    expect(result).toBe(42);
    expect(t.getSpans()).toHaveLength(1);
  });

  it('should trace async functions', async () => {
    const t = new Tracer();
    const result = await t.traceAsync('async-op', async () => 'done');
    expect(result).toBe('done');
  });

  it('should add events to spans', () => {
    const t = new Tracer();
    const span = t.startSpan('event-test');
    t.addEvent(span.spanId, { name: 'cache-hit', attributes: { key: 'abc' } });
    expect(span.events).toHaveLength(1);
    expect(span.events[0]!.name).toBe('cache-hit');
    t.endSpan(span.spanId);
  });

  it('should set attributes on spans', () => {
    const t = new Tracer();
    const span = t.startSpan('attr-test');
    t.setAttribute(span.spanId, 'user', '123');
    expect(span.attributes.user).toBe('123');
    t.endSpan(span.spanId);
  });

  it('should handle errors in traced functions', () => {
    const t = new Tracer();
    expect(() => t.trace('failing', () => { throw new Error('fail'); })).toThrow('fail');
    expect(t.getSpans()).toHaveLength(1);
    expect(t.getSpans()[0]!.status).toBe('error');
  });

  it('should filter spans by traceId', () => {
    const t = new Tracer();
    const s1 = t.startSpan('op1');
    const traceId = s1.traceId;
    t.endSpan(s1.spanId);
    const s2 = t.startSpan('op2');
    expect(t.getTrace(traceId)).toHaveLength(1);
    t.endSpan(s2.spanId);
  });

  it('should set and get context', () => {
    const t = new Tracer();
    t.setContext('session', 'abc-123');
    expect(t.getContext('session')).toBe('abc-123');
  });

  it('should clear all spans', () => {
    const t = new Tracer();
    t.startSpan('a'); t.startSpan('b');
    t.clear();
    expect(t.getSpans()).toHaveLength(0);
  });
});

describe('ObservabilityEngine', () => {
  it('should record and summarize metrics', () => {
    const oe = new ObservabilityEngine();
    oe.recordMetric('latency', 100); oe.recordMetric('latency', 200); oe.recordMetric('latency', 300);
    const summary = oe.getMetricSummary('latency', 60);
    expect(summary).not.toBeNull(); expect(summary!.avg).toBe(200); expect(summary!.count).toBe(3);
  });
  it('should calculate uncertainty', () => {
    const oe = new ObservabilityEngine();
    const u = oe.estimateUncertainty([10, 10, 10, 10]);
    expect(u.confidence).toBe(1); expect(u.variance).toBe(0);
  });
  it('should record and aggregate costs', () => {
    const oe = new ObservabilityEngine();
    oe.recordCost('openai', 'gpt-4', 100, 50, 0.01, 500);
    oe.recordCost('openai', 'gpt-4', 200, 100, 0.02, 800);
    const report = oe.getCostReport(7);
    expect(report.totalCost).toBe(0.03); expect(report.byProvider.openai).toBe(0.03);
  });
  it('should return null for non-existent metric', () => {
    const oe = new ObservabilityEngine();
    expect(oe.getMetricSummary('nonexistent')).toBeNull();
  });
});
