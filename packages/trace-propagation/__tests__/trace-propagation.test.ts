import { TracePropagation } from '../src/trace-propagation';
describe('TracePropagation', () => {
  it('should create trace context', () => {
    const tp = new TracePropagation(); const ctx = tp.createTraceContext();
    expect(ctx.traceparent).toMatch(/^00-/);
  });
  it('should create and end spans', () => {
    const tp = new TracePropagation(); const ctx = tp.createTraceContext();
    const span = tp.createSpan('read-file', 'file-bridge', ctx);
    tp.endSpan(span, 'ok');
    expect(span.duration).toBeGreaterThanOrEqual(0);
  });
  it('should get traces by id', () => {
    const tp = new TracePropagation(); const ctx = tp.createTraceContext();
    tp.createSpan('op1', 'mod1', ctx); tp.createSpan('op2', 'mod2', ctx);
    const traceId = ctx.traceparent.split('-')[1];
    expect(tp.getTrace(traceId)).toHaveLength(2);
  });
  it('should build service map', () => {
    const tp = new TracePropagation(); const ctx = tp.createTraceContext();
    const s1 = tp.createSpan('op1', 'module-a', ctx);
    const ctx2 = tp.createTraceContext();
    const s2 = tp.createSpan('op2', 'module-b', ctx2, s1.spanId);
    tp.endSpan(s1); tp.endSpan(s2);
    const map = tp.getServiceMap();
    expect(map.nodes.length).toBeGreaterThanOrEqual(1);
  });
  it('should export OpenTelemetry format', () => {
    const tp = new TracePropagation(); const ctx = tp.createTraceContext();
    tp.createSpan('test', 'mod', ctx); const otel = tp.exportOpenTelemetry();
    expect(otel).toContain('traceId');
  });
});
