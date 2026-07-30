import { MetricPoint, MetricSummary, SpanEvent, SpanStatus, TracerSpan, UncertaintyEstimate } from './types';
import { Logger } from '@ideia/logger';
export interface SpanExporter {
    export(span: TracerSpan): void | Promise<void>;
}
export declare class Tracer {
    private spans;
    private spanStack;
    private activeSpanId;
    private maxSpans;
    private exporter?;
    private ctx;
    private logger;
    constructor(logger?: Logger, exporter?: SpanExporter);
    get activeSpan(): TracerSpan | null;
    setContext(key: string, value: string): void;
    getContext(key: string): string | undefined;
    startSpan(name: string, options?: {
        parentSpanId?: string;
        attributes?: Record<string, unknown>;
    }): TracerSpan;
    endSpan(spanId?: string, status?: SpanStatus): void;
    addEvent(spanId: string | undefined, event: SpanEvent): void;
    setAttribute(spanId: string | undefined, key: string, value: unknown): void;
    trace<T>(name: string, fn: () => T, options?: {
        attributes?: Record<string, unknown>;
    }): T;
    traceAsync<T>(name: string, fn: () => Promise<T>, options?: {
        attributes?: Record<string, unknown>;
    }): Promise<T>;
    getSpans(): TracerSpan[];
    getTrace(traceId: string): TracerSpan[];
    clear(): void;
}
export declare class ObservabilityEngine {
    private metrics;
    private costs;
    private maxHistory;
    logger: Logger;
    tracer: Tracer;
    constructor(logger?: Logger, exporter?: SpanExporter);
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    recordCost(provider: string, model: string, tokensIn: number, tokensOut: number, costUsd: number, latencyMs: number): void;
    getMetricSummary(name: string, sinceMinutes?: number): MetricSummary | null;
    estimateUncertainty(values: number[]): UncertaintyEstimate;
    getCostReport(days?: number): {
        totalCost: number;
        byProvider: Record<string, number>;
        byModel: Record<string, number>;
        avgLatency: number;
        totalTokens: number;
    };
    getMetrics(): MetricPoint[];
    clear(): void;
}
export declare function createObservabilityEngine(logger?: Logger, exporter?: SpanExporter): ObservabilityEngine;
//# sourceMappingURL=observability-engine.d.ts.map