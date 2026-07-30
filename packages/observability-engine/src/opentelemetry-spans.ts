import { Tracer } from './observability-engine';
import { createLogger } from '@ideia/logger';
import type { SpanStatus } from './types';
const logger = createLogger('opentelemetry-spans');

export type SpanCategory = 'chat' | 'agent' | 'autofix' | 'scan' | 'lsp';

export interface SpanDefinition {
  name: string;
  category: SpanCategory;
  description: string;
}

export const SPAN_DEFINITIONS: SpanDefinition[] = [
  { name: 'chat.request', category: 'chat', description: 'Chat request processing' },
  { name: 'chat.response', category: 'chat', description: 'Chat response generation' },
  { name: 'agent.execute', category: 'agent', description: 'Agent execution cycle' },
  { name: 'agent.plan', category: 'agent', description: 'Agent planning phase' },
  { name: 'agent.tool', category: 'agent', description: 'Agent tool invocation' },
  { name: 'autofix.scan', category: 'autofix', description: 'Auto-fix scan cycle' },
  { name: 'autofix.apply', category: 'autofix', description: 'Auto-fix application' },
  { name: 'autofix.verify', category: 'autofix', description: 'Auto-fix verification' },
  { name: 'scan.cycle', category: 'scan', description: 'Scan cycle execution' },
  { name: 'scan.package', category: 'scan', description: 'Package scanning' },
  { name: 'scan.study', category: 'scan', description: 'Study scanning' },
  { name: 'lsp.request', category: 'lsp', description: 'LSP request handling' },
  { name: 'lsp.completion', category: 'lsp', description: 'LSP completion provider' },
  { name: 'lsp.hover', category: 'lsp', description: 'LSP hover provider' },
];

export class SpanTracer {
  private tracer: Tracer;

  constructor(tracer: Tracer) {
    this.tracer = tracer;
  }

  traceChatRequest(metadata?: Record<string, unknown>): string {
    const span = this.tracer.startSpan('chat.request', { attributes: { category: 'chat', ...metadata } });
    return span.spanId;
  }

  endChatRequest(spanId: string, status?: SpanStatus): void {
    this.tracer.endSpan(spanId, status);
  }

  traceAgentExecution(agentName: string, metadata?: Record<string, unknown>): string {
    const span = this.tracer.startSpan('agent.execute', {
      attributes: { category: 'agent', agent: agentName, ...metadata },
    });
    return span.spanId;
  }

  endAgentExecution(spanId: string, status?: SpanStatus): void {
    this.tracer.endSpan(spanId, status);
  }

  traceAutoFix(metadata?: Record<string, unknown>): string {
    const span = this.tracer.startSpan('autofix.scan', {
      attributes: { category: 'autofix', ...metadata },
    });
    return span.spanId;
  }

  endAutoFix(spanId: string, status?: SpanStatus): void {
    this.tracer.endSpan(spanId, status);
  }

  traceScanCycle(scanType: string, metadata?: Record<string, unknown>): string {
    const span = this.tracer.startSpan('scan.cycle', {
      attributes: { category: 'scan', scanType, ...metadata },
    });
    return span.spanId;
  }

  endScanCycle(spanId: string, status?: SpanStatus): void {
    this.tracer.endSpan(spanId, status);
  }

  traceLSPRequest(requestType: string, metadata?: Record<string, unknown>): string {
    const span = this.tracer.startSpan('lsp.request', {
      attributes: { category: 'lsp', requestType, ...metadata },
    });
    return span.spanId;
  }

  endLSPRequest(spanId: string, status?: SpanStatus): void {
    this.tracer.endSpan(spanId, status);
  }

  getSpansByCategory(category: SpanCategory) {
    return this.tracer.getSpans().filter(s => s.attributes.category === category);
  }

  getSpanStats(category?: SpanCategory): { total: number; byStatus: Record<string, number>; avgDurationMs: number } {
    const spans = category ? this.getSpansByCategory(category) : this.tracer.getSpans();
    const completed = spans.filter(s => s.endTime);
    const byStatus: Record<string, number> = {};
    for (const s of spans) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    }
    const avgDurationMs = completed.length > 0
      ? completed.reduce((sum, s) => sum + (s.durationMs ?? 0), 0) / completed.length
      : 0;
    return { total: spans.length, byStatus, avgDurationMs };
  }
}

export function createSpanTracer(tracer: Tracer): SpanTracer {
  return new SpanTracer(tracer);
}
