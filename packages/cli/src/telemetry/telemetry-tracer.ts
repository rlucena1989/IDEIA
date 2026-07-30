import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('telemetry-tracer');

export interface TraceSpan {
  spanId: string;
  requestId: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  status: 'started' | 'ok' | 'warning' | 'error';
}

export class TelemetryTracer {
  private spans: TraceSpan[] = [];

  startSpan(requestId: string, name: string): TraceSpan {
    const span: TraceSpan = {
      spanId: crypto.randomUUID(),
      requestId,
      name,
      startedAt: new Date().toISOString(),
      status: 'started',
    };
    this.spans.push(span);
    return span;
  }

  endSpan(spanId: string, status: TraceSpan['status'], durationMs: number): void {
    const span = this.spans.find(s => s.spanId === spanId);
    if (!span) return;
    span.status = status;
    span.endedAt = new Date().toISOString();
    span.durationMs = durationMs;
  }

  listSpans(): TraceSpan[] {
    return [...this.spans];
  }

  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.find(s => s.spanId === spanId);
  }

  clear(): void {
    this.spans = [];
  }
}
