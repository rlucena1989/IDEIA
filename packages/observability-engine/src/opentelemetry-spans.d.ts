import { Tracer } from './observability-engine';
import type { SpanStatus } from './types';
export type SpanCategory = 'chat' | 'agent' | 'autofix' | 'scan' | 'lsp';
export interface SpanDefinition {
    name: string;
    category: SpanCategory;
    description: string;
}
export declare const SPAN_DEFINITIONS: SpanDefinition[];
export declare class SpanTracer {
    private tracer;
    constructor(tracer: Tracer);
    traceChatRequest(metadata?: Record<string, unknown>): string;
    endChatRequest(spanId: string, status?: SpanStatus): void;
    traceAgentExecution(agentName: string, metadata?: Record<string, unknown>): string;
    endAgentExecution(spanId: string, status?: SpanStatus): void;
    traceAutoFix(metadata?: Record<string, unknown>): string;
    endAutoFix(spanId: string, status?: SpanStatus): void;
    traceScanCycle(scanType: string, metadata?: Record<string, unknown>): string;
    endScanCycle(spanId: string, status?: SpanStatus): void;
    traceLSPRequest(requestType: string, metadata?: Record<string, unknown>): string;
    endLSPRequest(spanId: string, status?: SpanStatus): void;
    getSpansByCategory(category: SpanCategory): import("./types").TracerSpan[];
    getSpanStats(category?: SpanCategory): {
        total: number;
        byStatus: Record<string, number>;
        avgDurationMs: number;
    };
}
export declare function createSpanTracer(tracer: Tracer): SpanTracer;
//# sourceMappingURL=opentelemetry-spans.d.ts.map