import { performance } from 'node:perf_hooks';

export interface Span {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, string | number | boolean>;
  status: 'ok' | 'error';
  error?: string;
}

export interface Trace {
  traceId: string;
  spans: Span[];
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

export interface MetricPoint {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
  type: 'counter' | 'gauge' | 'histogram';
}

export class OpenTelemetry {
  private traces = new Map<string, Trace>();
  private spans = new Map<string, Span>();
  private metrics: MetricPoint[] = [];
  private activeSpans = new Map<string, Span>();
  private nextId = 1;
  private samplingRate = 1.0;

  setSamplingRate(rate: number): void {
    this.samplingRate = Math.max(0, Math.min(1, rate));
  }

  private generateId(): string {
    const id = this.nextId++;
    return `trace-${Date.now().toString(36)}-${id.toString(36)}`;
  }

  startSpan(name: string, options?: { parentSpanId?: string; attributes?: Record<string, string | number | boolean> }): Span {
    const traceId = options?.parentSpanId
      ? (this.spans.get(options.parentSpanId)?.traceId ?? this.generateId())
      : this.generateId();
    const spanId = this.generateId();

    const span: Span = {
      name,
      traceId,
      spanId,
      parentSpanId: options?.parentSpanId,
      startTime: performance.now(),
      attributes: options?.attributes ?? {},
      status: 'ok',
    };

    this.spans.set(spanId, span);
    this.activeSpans.set(spanId, span);

    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, { traceId, spans: [], startTime: Date.now() });
    }

    return span;
  }

  endSpan(spanId: string, status?: 'ok' | 'error', error?: string): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = performance.now();
    span.durationMs = span.endTime - span.startTime;
    span.status = status ?? 'ok';
    span.error = error;

    this.activeSpans.delete(spanId);

    const trace = this.traces.get(span.traceId);
    if (trace) {
      trace.spans.push(span);
      trace.endTime = Date.now();
      trace.durationMs = trace.endTime - trace.startTime;
    }
  }

  recordMetric(name: string, value: number, labels?: Record<string, string>, type?: MetricPoint['type']): void {
    this.metrics.push({
      name,
      value,
      labels: labels ?? {},
      timestamp: Date.now(),
      type: type ?? 'counter',
    });
  }

  incrementCounter(name: string, value?: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value ?? 1, labels, 'counter');
  }

  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, labels, 'gauge');
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, labels, 'histogram');
  }

  getActiveSpans(): Span[] {
    return Array.from(this.activeSpans.values());
  }

  getTraces(limit?: number): Trace[] {
    const all = Array.from(this.traces.values());
    return limit ? all.slice(-limit) : all;
  }

  getMetrics(): MetricPoint[] {
    return [...this.metrics];
  }

  getMetricsByName(name: string): MetricPoint[] {
    return this.metrics.filter(m => m.name === name);
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  clearTraces(): void {
    this.traces.clear();
    this.spans.clear();
  }

  async export(): Promise<{ traces: Trace[]; metrics: MetricPoint[] }> {
    return {
      traces: this.getTraces(100),
      metrics: this.getMetrics(),
    };
  }

  getSummary(): { totalTraces: number; totalSpans: number; totalMetrics: number; activeSpans: number } {
    return {
      totalTraces: this.traces.size,
      totalSpans: this.spans.size,
      totalMetrics: this.metrics.length,
      activeSpans: this.activeSpans.size,
    };
  }
}

let defaultInstance: OpenTelemetry | null = null;

export function getTelemetry(): OpenTelemetry {
  if (!defaultInstance) {
    defaultInstance = new OpenTelemetry();
  }
  return defaultInstance;
}

export function resetTelemetry(): void {
  defaultInstance = null;
}
