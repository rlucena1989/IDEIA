export interface Span { traceId: string; spanId: string; parentSpanId?: string; operation: string; module: string; startTime: string; endTime?: string; duration?: number; status: 'ok'|'error'; error?: string; metadata?: Record<string,unknown>; }
export interface TraceContext { traceparent: string; tracestate?: string; }
export interface ServiceMapNode { module: string; calls: number; errors: number; avgDuration: number; }
export interface ServiceMapEdge { source: string; target: string; calls: number; errors: number; }
