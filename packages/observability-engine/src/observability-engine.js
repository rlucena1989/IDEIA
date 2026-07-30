"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityEngine = exports.Tracer = void 0;
exports.createObservabilityEngine = createObservabilityEngine;
const crypto_1 = require("crypto");
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('observability-engine');
class Tracer {
    spans = [];
    spanStack = [];
    activeSpanId = null;
    maxSpans = 10000;
    exporter;
    ctx = new Map();
    logger;
    constructor(logger, exporter) {
        this.logger = logger ?? log;
        this.exporter = exporter;
    }
    get activeSpan() {
        if (!this.activeSpanId)
            return null;
        return this.spans.find(s => s.spanId === this.activeSpanId) ?? null;
    }
    setContext(key, value) { this.ctx.set(key, value); }
    getContext(key) { return this.ctx.get(key); }
    startSpan(name, options) {
        const spanId = (0, crypto_1.randomUUID)();
        const span = {
            spanId,
            traceId: options?.parentSpanId ? (this.spans.find(s => s.spanId === options.parentSpanId)?.traceId ?? (0, crypto_1.randomUUID)()) : (0, crypto_1.randomUUID)(),
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
        if (this.spans.length > this.maxSpans)
            this.spans.shift();
        return span;
    }
    endSpan(spanId, status) {
        const id = spanId ?? this.activeSpanId;
        if (!id)
            return;
        const span = this.spans.find(s => s.spanId === id);
        if (!span)
            return;
        span.endTime = Date.now();
        span.durationMs = span.endTime - span.startTime;
        if (status)
            span.status = status;
        this.spanStack = this.spanStack.filter(s => s !== id);
        this.activeSpanId = this.spanStack.length > 0 ? (this.spanStack[this.spanStack.length - 1] ?? null) : null;
        if (this.exporter) {
            try {
                this.exporter.export(span);
            }
            catch (_err) {
                this.logger.error('Span export failed', { error: String(_err) });
            }
        }
    }
    addEvent(spanId, event) {
        const id = spanId ?? this.activeSpanId;
        if (!id)
            return;
        const span = this.spans.find(s => s.spanId === id);
        if (!span)
            return;
        span.events.push({ ...event, timestamp: event.timestamp ?? Date.now() });
    }
    setAttribute(spanId, key, value) {
        const id = spanId ?? this.activeSpanId;
        if (!id)
            return;
        const span = this.spans.find(s => s.spanId === id);
        if (!span)
            return;
        span.attributes[key] = value;
    }
    trace(name, fn, options) {
        const span = this.startSpan(name, options);
        try {
            const result = fn();
            this.endSpan(span.spanId, 'ok');
            return result;
        }
        catch (_err) {
            this.addEvent(span.spanId, { name: 'error', attributes: { error: String(_err) } });
            this.endSpan(span.spanId, 'error');
            throw _err;
        }
    }
    async traceAsync(name, fn, options) {
        const span = this.startSpan(name, options);
        try {
            const result = await fn();
            this.endSpan(span.spanId, 'ok');
            return result;
        }
        catch (_err) {
            this.addEvent(span.spanId, { name: 'error', attributes: { error: String(_err) } });
            this.endSpan(span.spanId, 'error');
            throw _err;
        }
    }
    getSpans() { return [...this.spans]; }
    getTrace(traceId) { return this.spans.filter(s => s.traceId === traceId); }
    clear() { this.spans = []; this.spanStack = []; this.activeSpanId = null; }
}
exports.Tracer = Tracer;
class ObservabilityEngine {
    metrics = [];
    costs = [];
    maxHistory = 10000;
    logger;
    tracer;
    constructor(logger, exporter) {
        this.logger = logger ?? log;
        this.tracer = new Tracer(logger, exporter);
    }
    recordMetric(name, value, tags = {}) {
        this.metrics.push({ name, value, tags, timestamp: new Date().toISOString() });
        if (this.metrics.length > this.maxHistory)
            this.metrics.shift();
    }
    recordCost(provider, model, tokensIn, tokensOut, costUsd, latencyMs) {
        this.costs.push({ provider, model, tokensIn, tokensOut, costUsd, latencyMs, timestamp: new Date().toISOString() });
        if (this.costs.length > this.maxHistory)
            this.costs.shift();
    }
    getMetricSummary(name, sinceMinutes = 60) {
        const cutoff = Date.now() - sinceMinutes * 60 * 1000;
        const points = this.metrics.filter(m => m.name === name && new Date(m.timestamp).getTime() > cutoff);
        if (points.length === 0)
            return null;
        const values = points.map(p => p.value).sort((a, b) => a - b);
        return {
            name, avg: values.reduce((s, v) => s + v, 0) / values.length, min: values[0] ?? 0, max: values[values.length - 1] ?? 0,
            p95: values[Math.floor(values.length * 0.95)] ?? 0, count: values.length, lastUpdated: points[points.length - 1]?.timestamp ?? '',
        };
    }
    estimateUncertainty(values) {
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
        const stddev = Math.sqrt(variance);
        const confidence = Math.max(0, Math.min(1, 1 - (stddev / (Math.abs(avg) || 1))));
        return { value: avg, confidence: Math.round(confidence * 1000) / 1000, variance: Math.round(variance * 1000) / 1000, interval: [avg - stddev, avg + stddev] };
    }
    getCostReport(days = 7) {
        const cutoff = Date.now() - days * 86400000;
        const recent = this.costs.filter(c => new Date(c.timestamp).getTime() > cutoff);
        const byProvider = {};
        const byModel = {};
        let totalCost = 0, totalLatency = 0, totalTokens = 0;
        for (const c of recent) {
            totalCost += c.costUsd;
            totalLatency += c.latencyMs;
            totalTokens += c.tokensIn + c.tokensOut;
            byProvider[c.provider] = (byProvider[c.provider] || 0) + c.costUsd;
            byModel[c.model] = (byModel[c.model] || 0) + c.costUsd;
        }
        return { totalCost, byProvider, byModel, avgLatency: recent.length ? totalLatency / recent.length : 0, totalTokens };
    }
    getMetrics() { return [...this.metrics]; }
    clear() { this.metrics = []; this.costs = []; this.tracer.clear(); }
}
exports.ObservabilityEngine = ObservabilityEngine;
function createObservabilityEngine(logger, exporter) {
    return new ObservabilityEngine(logger, exporter);
}
//# sourceMappingURL=observability-engine.js.map