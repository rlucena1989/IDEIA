import { randomUUID } from 'crypto';
import { CostRecord, MetricPoint, MetricSummary, SpanEvent, SpanStatus, TracerSpan, UncertaintyEstimate } from './types';
import { createLogger, Logger } from '@ideia/logger';

export interface SpanExporter {
  export(span: TracerSpan): void | Promise<void>;
}

const log = createLogger('observability-engine');

export class Tracer {
  private spans: TracerSpan[] = [];
  private spanStack: string[] = [];
  private activeSpanId: string | null = null;
  private maxSpans = 10000;
  private exporter?: SpanExporter;
  private ctx: Map<string, string> = new Map();
  private logger: Logger;

  constructor(logger?: Logger, exporter?: SpanExporter) {
    this.logger = logger ?? log;
    this.exporter = exporter;
  }

  get activeSpan(): TracerSpan | null {
    if (!this.activeSpanId) return null;
    return this.spans.find(s => s.spanId === this.activeSpanId) ?? null;
  }

  setContext(key: string, value: string): void { this.ctx.set(key, value); }
  getContext(key: string): string | undefined { return this.ctx.get(key); }

  startSpan(name: string, options?: { parentSpanId?: string; attributes?: Record<string, unknown> }): TracerSpan {
    const spanId = randomUUID();
    const span: TracerSpan = {
      spanId,
      traceId: options?.parentSpanId ? (this.spans.find(s => s.spanId === options.parentSpanId)?.traceId ?? randomUUID()) : randomUUID(),
      parentSpanId: options?.parentSpanId ?? this.activeSpanId ?? undefined,
      name,
      status: 'ok',
      startTime: Date.now(),
      attributes: { ...options?.attributes },
      events: [],
    };
    this.spans.push(span);
    this.spanStack.push(spanId);
    this.activeSpanId = spanId;
    if (this.spans.length > this.maxSpans) this.spans.shift();
    return span;
  }

  endSpan(spanId?: string, status?: SpanStatus): void {
    const id = spanId ?? this.activeSpanId;
    if (!id) return;
    const span = this.spans.find(s => s.spanId === id);
    if (!span) return;
    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    if (status) span.status = status;
    this.spanStack = this.spanStack.filter(s => s !== id);
    this.activeSpanId = this.spanStack.length > 0 ? (this.spanStack[this.spanStack.length - 1] ?? null) : null;
    if (this.exporter) {
      try {
        this.exporter.export(span);
      } catch (_err) {
        this.logger.error('Span export failed', { error: String(_err) });
      }
    }
  }

  addEvent(spanId: string | undefined, event: SpanEvent): void {
    const id = spanId ?? this.activeSpanId;
    if (!id) return;
    const span = this.spans.find(s => s.spanId === id);
    if (!span) return;
    span.events.push({ ...event, timestamp: event.timestamp ?? Date.now() });
  }

  setAttribute(spanId: string | undefined, key: string, value: unknown): void {
    const id = spanId ?? this.activeSpanId;
    if (!id) return;
    const span = this.spans.find(s => s.spanId === id);
    if (!span) return;
    span.attributes[key] = value;
  }

  trace<T>(name: string, fn: () => T, options?: { attributes?: Record<string, unknown> }): T {
    const span = this.startSpan(name, options);
    try {
      const result = fn();
      this.endSpan(span.spanId, 'ok');
      return result;
    } catch (_err) {
      this.addEvent(span.spanId, { name: 'error', attributes: { error: String(_err) } });
      this.endSpan(span.spanId, 'error');
      throw _err;
    }
  }

  async traceAsync<T>(name: string, fn: () => Promise<T>, options?: { attributes?: Record<string, unknown> }): Promise<T> {
    const span = this.startSpan(name, options);
    try {
      const result = await fn();
      this.endSpan(span.spanId, 'ok');
      return result;
    } catch (_err) {
      this.addEvent(span.spanId, { name: 'error', attributes: { error: String(_err) } });
      this.endSpan(span.spanId, 'error');
      throw _err;
    }
  }

  getSpans(): TracerSpan[] { return [...this.spans]; }
  getTrace(traceId: string): TracerSpan[] { return this.spans.filter(s => s.traceId === traceId); }
  clear(): void { this.spans = []; this.spanStack = []; this.activeSpanId = null; }
}

export class ObservabilityEngine {
  private metrics: MetricPoint[] = [];
  private costs: CostRecord[] = [];
  private maxHistory = 10000;
  logger: Logger;
  tracer: Tracer;

  constructor(logger?: Logger, exporter?: SpanExporter) {
    this.logger = logger ?? log;
    this.tracer = new Tracer(logger, exporter);
  }

  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    this.metrics.push({ name, value, tags, timestamp: new Date().toISOString() });
    if (this.metrics.length > this.maxHistory) this.metrics.shift();
  }

  recordCost(provider: string, model: string, tokensIn: number, tokensOut: number, costUsd: number, latencyMs: number): void {
    this.costs.push({ provider, model, tokensIn, tokensOut, costUsd, latencyMs, timestamp: new Date().toISOString() });
    if (this.costs.length > this.maxHistory) this.costs.shift();
  }

  getMetricSummary(name: string, sinceMinutes = 60): MetricSummary | null {
    const cutoff = Date.now() - sinceMinutes * 60 * 1000;
    const points = this.metrics.filter(m => m.name === name && new Date(m.timestamp).getTime() > cutoff);
    if (points.length === 0) return null;
    const values = points.map(p => p.value).sort((a, b) => a - b);
    return {
      name, avg: values.reduce((s, v) => s + v, 0) / values.length, min: values[0] ?? 0, max: values[values.length - 1] ?? 0,
      p95: values[Math.floor(values.length * 0.95)] ?? 0, count: values.length, lastUpdated: points[points.length - 1]?.timestamp ?? '',
    };
  }

  estimateUncertainty(values: number[]): UncertaintyEstimate {
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(1, 1 - (stddev / (Math.abs(avg) || 1))));
    return { value: avg, confidence: Math.round(confidence * 1000) / 1000, variance: Math.round(variance * 1000) / 1000, interval: [avg - stddev, avg + stddev] };
  }

  getCostReport(days = 7): { totalCost: number; byProvider: Record<string, number>; byModel: Record<string, number>; avgLatency: number; totalTokens: number } {
    const cutoff = Date.now() - days * 86400000;
    const recent = this.costs.filter(c => new Date(c.timestamp).getTime() > cutoff);
    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalCost = 0, totalLatency = 0, totalTokens = 0;
    for (const c of recent) {
      totalCost += c.costUsd; totalLatency += c.latencyMs; totalTokens += c.tokensIn + c.tokensOut;
      byProvider[c.provider] = (byProvider[c.provider] || 0) + c.costUsd;
      byModel[c.model] = (byModel[c.model] || 0) + c.costUsd;
    }
    return { totalCost, byProvider, byModel, avgLatency: recent.length ? totalLatency / recent.length : 0, totalTokens };
  }

  getMetrics(): MetricPoint[] { return [...this.metrics]; }
  clear(): void { this.metrics = []; this.costs = []; this.tracer.clear(); }
}

export function createObservabilityEngine(logger?: Logger, exporter?: SpanExporter): ObservabilityEngine {
  return new ObservabilityEngine(logger, exporter);
}
