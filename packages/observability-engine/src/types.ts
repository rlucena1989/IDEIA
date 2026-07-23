export interface MetricPoint { name: string; value: number; tags: Record<string,string>; timestamp: string; }
export interface CostRecord { provider: string; model: string; tokensIn: number; tokensOut: number; costUsd: number; latencyMs: number; timestamp: string; }
export interface UncertaintyEstimate { value: number; confidence: number; variance: number; interval: [number,number]; }
export interface MetricSummary { name: string; avg: number; min: number; max: number; p95: number; count: number; lastUpdated: string; }

export type SpanStatus = 'ok' | 'error' | 'warning';

export interface SpanEvent {
  name: string;
  timestamp?: number;
  attributes?: Record<string, unknown>;
}

export interface TracerSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  status: SpanStatus;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
}
