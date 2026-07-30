"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTelBridge = exports.HTTPExporter = exports.ConsoleExporter = void 0;
exports.createOTelBridge = createOTelBridge;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('observability-engine:opentelemetry');
class ConsoleExporter {
    async exportSpans(spans) {
        for (const span of spans) {
            logger.info('OTel span', {
                traceId: span.traceId,
                spanId: span.spanId,
                parentSpanId: span.parentSpanId,
                name: span.name,
                durationMs: span.durationMs,
                status: span.status,
                attributes: span.attributes,
                events: span.events,
            });
        }
    }
    async exportMetrics(metrics) {
        for (const metric of metrics) {
            logger.info('OTel metric', {
                name: metric.name,
                value: metric.value,
                type: metric.type,
                timestamp: metric.timestamp,
                attributes: metric.attributes,
            });
        }
    }
    async shutdown() { }
}
exports.ConsoleExporter = ConsoleExporter;
class HTTPExporter {
    endpoint;
    constructor(config) {
        this.endpoint = config.endpoint ?? 'http://localhost:4318';
    }
    async exportSpans(spans) {
        try {
            const body = JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans }] }] });
            await fetch(`${this.endpoint}/v1/traces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
        }
        catch {
            // silently fail — OTel is best-effort
        }
    }
    async exportMetrics(metrics) {
        try {
            const body = JSON.stringify({ resourceMetrics: [{ scopeMetrics: [{ metrics }] }] });
            await fetch(`${this.endpoint}/v1/metrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
        }
        catch {
            // silently fail
        }
    }
    async shutdown() { }
}
exports.HTTPExporter = HTTPExporter;
class OTelBridge {
    exporters = [];
    spanBuffer = [];
    metricBuffer = [];
    maxBufferSize = 100;
    flushInterval = null;
    serviceName;
    serviceVersion;
    environment;
    constructor(config) {
        this.serviceName = config?.serviceName ?? 'ideia';
        this.serviceVersion = config?.serviceVersion ?? '1.0.0';
        this.environment = config?.environment ?? process.env.NODE_ENV ?? 'development';
    }
    addExporter(exporter) { this.exporters.push(exporter); }
    start(flushIntervalMs = 5000) {
        if (this.flushInterval)
            return;
        this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
    }
    async stop() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        await this.flush();
        for (const e of this.exporters)
            await e.shutdown();
    }
    recordSpan(span) {
        const enriched = {
            ...span,
            attributes: {
                ...span.attributes,
                'service.name': this.serviceName,
                'service.version': this.serviceVersion,
                'deployment.environment': this.environment,
            },
        };
        this.spanBuffer.push(enriched);
        if (this.spanBuffer.length >= this.maxBufferSize)
            this.flush();
    }
    recordMetric(metric) {
        this.metricBuffer.push(metric);
        if (this.metricBuffer.length >= this.maxBufferSize)
            this.flush();
    }
    async flush() {
        if (this.spanBuffer.length === 0 && this.metricBuffer.length === 0)
            return;
        const spans = [...this.spanBuffer];
        const metrics = [...this.metricBuffer];
        this.spanBuffer = [];
        this.metricBuffer = [];
        for (const exporter of this.exporters) {
            try {
                if (spans.length > 0)
                    await exporter.exportSpans(spans);
                if (metrics.length > 0)
                    await exporter.exportMetrics(metrics);
            }
            catch {
                // individual exporter failure should not block others
            }
        }
    }
    createSpanExporter() {
        return {
            export: (span) => {
                this.recordSpan({
                    traceId: span.traceId,
                    spanId: span.spanId,
                    parentSpanId: span.parentSpanId,
                    name: span.name,
                    startTime: span.startTime,
                    endTime: span.endTime,
                    durationMs: span.durationMs,
                    status: span.status,
                    attributes: span.attributes,
                    events: span.events.map((e) => ({
                        name: e.name,
                        timestamp: e.timestamp ?? Date.now(),
                        attributes: e.attributes,
                    })),
                });
            },
        };
    }
}
exports.OTelBridge = OTelBridge;
function createOTelBridge(config) {
    return new OTelBridge(config);
}
//# sourceMappingURL=opentelemetry.js.map