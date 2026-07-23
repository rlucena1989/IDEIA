import { randomUUID } from 'crypto'; import { ServiceMapEdge, ServiceMapNode, Span, TraceContext } from './types';
export class TracePropagation {
  private spans: Span[] = []; private maxSpans = 10000;
  createTraceContext(): TraceContext {
    const traceId = randomUUID().replace(/-/g, '').slice(0, 32);
    const spanId = randomUUID().replace(/-/g, '').slice(0, 16);
    return { traceparent: `00-${traceId}-${spanId}-01`, tracestate: '' };
  }
  createSpan(operation: string, module: string, traceContext: TraceContext, parentSpanId?: string): Span {
    const traceId = traceContext.traceparent.split('-')[1];
    const span: Span = { traceId, spanId: randomUUID().replace(/-/g, '').slice(0, 16), parentSpanId, operation, module, startTime: new Date().toISOString(), status: 'ok' };
    this.spans.push(span); if (this.spans.length > this.maxSpans) this.spans.shift();
    return span;
  }
  endSpan(span: Span, status: 'ok'|'error' = 'ok', error?: string): void {
    span.endTime = new Date().toISOString();
    span.duration = new Date(span.endTime).getTime() - new Date(span.startTime).getTime();
    span.status = status; if (error) span.error = error;
  }
  getTrace(traceId: string): Span[] { return this.spans.filter(s => s.traceId === traceId); }
  getServiceMap(): { nodes: ServiceMapNode[]; edges: ServiceMapEdge[] } {
    const nodeMap = new Map<string, { calls: number; errors: number; totalDuration: number }>();
    const edgeMap = new Map<string, { calls: number; errors: number }>();
    for (const span of this.spans) {
      const n = nodeMap.get(span.module) || { calls: 0, errors: 0, totalDuration: 0 };
      n.calls++; if (span.status === 'error') n.errors++; n.totalDuration += span.duration || 0;
      nodeMap.set(span.module, n);
      if (span.parentSpanId) {
        const parent = this.spans.find(s => s.spanId === span.parentSpanId);
        if (parent) {
          const key = `${parent.module}:${span.module}`; const e = edgeMap.get(key) || { calls: 0, errors: 0 };
          e.calls++; if (span.status === 'error') e.errors++; edgeMap.set(key, e);
        }
      }
    }
    return {
      nodes: Array.from(nodeMap.entries()).map(([module, data]) => ({ module, calls: data.calls, errors: data.errors, avgDuration: Math.round(data.totalDuration / data.calls) })),
      edges: Array.from(edgeMap.entries()).map(([key, data]) => { const [source, target] = key.split(':'); return { source, target, calls: data.calls, errors: data.errors }; }),
    };
  }
  exportOpenTelemetry(): string { return JSON.stringify(this.spans.map(s => ({ traceId: s.traceId, spanId: s.spanId, parentSpanId: s.parentSpanId, name: s.operation, startTime: s.startTime, endTime: s.endTime, attributes: { module: s.module } }))); }
  clear(): void { this.spans = []; }
}
export function createTracePropagation(): TracePropagation { return new TracePropagation(); }
