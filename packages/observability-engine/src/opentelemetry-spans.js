"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanTracer = exports.SPAN_DEFINITIONS = void 0;
exports.createSpanTracer = createSpanTracer;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('opentelemetry-spans');
exports.SPAN_DEFINITIONS = [
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
class SpanTracer {
    tracer;
    constructor(tracer) {
        this.tracer = tracer;
    }
    traceChatRequest(metadata) {
        const span = this.tracer.startSpan('chat.request', { attributes: { category: 'chat', ...metadata } });
        return span.spanId;
    }
    endChatRequest(spanId, status) {
        this.tracer.endSpan(spanId, status);
    }
    traceAgentExecution(agentName, metadata) {
        const span = this.tracer.startSpan('agent.execute', {
            attributes: { category: 'agent', agent: agentName, ...metadata },
        });
        return span.spanId;
    }
    endAgentExecution(spanId, status) {
        this.tracer.endSpan(spanId, status);
    }
    traceAutoFix(metadata) {
        const span = this.tracer.startSpan('autofix.scan', {
            attributes: { category: 'autofix', ...metadata },
        });
        return span.spanId;
    }
    endAutoFix(spanId, status) {
        this.tracer.endSpan(spanId, status);
    }
    traceScanCycle(scanType, metadata) {
        const span = this.tracer.startSpan('scan.cycle', {
            attributes: { category: 'scan', scanType, ...metadata },
        });
        return span.spanId;
    }
    endScanCycle(spanId, status) {
        this.tracer.endSpan(spanId, status);
    }
    traceLSPRequest(requestType, metadata) {
        const span = this.tracer.startSpan('lsp.request', {
            attributes: { category: 'lsp', requestType, ...metadata },
        });
        return span.spanId;
    }
    endLSPRequest(spanId, status) {
        this.tracer.endSpan(spanId, status);
    }
    getSpansByCategory(category) {
        return this.tracer.getSpans().filter(s => s.attributes.category === category);
    }
    getSpanStats(category) {
        const spans = category ? this.getSpansByCategory(category) : this.tracer.getSpans();
        const completed = spans.filter(s => s.endTime);
        const byStatus = {};
        for (const s of spans) {
            byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
        }
        const avgDurationMs = completed.length > 0
            ? completed.reduce((sum, s) => sum + (s.durationMs ?? 0), 0) / completed.length
            : 0;
        return { total: spans.length, byStatus, avgDurationMs };
    }
}
exports.SpanTracer = SpanTracer;
function createSpanTracer(tracer) {
    return new SpanTracer(tracer);
}
//# sourceMappingURL=opentelemetry-spans.js.map