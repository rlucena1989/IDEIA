"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLOMonitor = void 0;
exports.createDefaultSLOs = createDefaultSLOs;
exports.createSLOMonitor = createSLOMonitor;
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('slo-monitor');
class SLOMonitor {
    slos = new Map();
    data = new Map();
    timestamps = new Map();
    logger;
    constructor(logger) {
        this.logger = logger ?? log;
    }
    defineSLO(name, target, windowMs, description) {
        this.slos.set(name, { name, target, windowMs, description });
        if (!this.data.has(name))
            this.data.set(name, []);
        if (!this.timestamps.has(name))
            this.timestamps.set(name, []);
        this.logger.info(`SLO defined: ${name} (target: ${target}, window: ${windowMs}ms)`);
    }
    record(metric, value) {
        const now = Date.now();
        if (!this.data.has(metric))
            this.data.set(metric, []);
        if (!this.timestamps.has(metric))
            this.timestamps.set(metric, []);
        const values = this.data.get(metric);
        const times = this.timestamps.get(metric);
        values.push(value);
        times.push(now);
        const slo = this.slos.get(metric);
        if (slo) {
            const cutoff = now - slo.windowMs;
            while (times.length > 0 && (times[0] ?? 0) < cutoff) {
                times.shift();
                values.shift();
            }
        }
        if (values.length > 10000) {
            values.splice(0, values.length - 10000);
            times.splice(0, times.length - 10000);
        }
    }
    check(metric) {
        const slo = this.slos.get(metric);
        const values = this.data.get(metric) ?? [];
        const times = this.timestamps.get(metric) ?? [];
        if (!slo || values.length === 0) {
            return { status: 'pass', slo, value: 0, errorBudget: 1, errorBudgetUsed: 0 };
        }
        const cutoff = Date.now() - slo.windowMs;
        const recent = [];
        for (let i = 0; i < times.length; i++) {
            if ((times[i] ?? 0) >= cutoff)
                recent.push(values[i] ?? 0);
        }
        if (recent.length === 0) {
            return { status: 'pass', slo, value: 0, errorBudget: 1, errorBudgetUsed: 0 };
        }
        const goodCount = recent.filter(v => v >= slo.target).length;
        const currentValue = goodCount / recent.length;
        const errorBudget = 1 - slo.target;
        const errorRate = 1 - currentValue;
        const errorBudgetUsed = errorBudget > 0 ? Math.min(1, errorRate / errorBudget) : 1;
        let status = 'pass';
        if (errorBudgetUsed >= 1)
            status = 'fail';
        else if (errorBudgetUsed >= 0.8)
            status = 'warning';
        return { status, slo, value: currentValue, errorBudget, errorBudgetUsed };
    }
    getSLODashboard() {
        const dashboard = [];
        for (const [name, slo] of this.slos) {
            const result = this.check(name);
            const values = this.data.get(name) ?? [];
            dashboard.push({
                name,
                target: slo.target,
                currentValue: result.value,
                status: result.status,
                errorBudget: result.errorBudget,
                errorBudgetUsed: result.errorBudgetUsed,
                dataPoints: values.length,
                lastUpdated: values.length > 0 ? new Date().toISOString() : 'never',
            });
        }
        return dashboard;
    }
    getBurnRate(metric, windowMs) {
        const slo = this.slos.get(metric);
        const values = this.data.get(metric) ?? [];
        const times = this.timestamps.get(metric) ?? [];
        const cutoff = Date.now() - windowMs;
        const recent = [];
        for (let i = 0; i < times.length; i++) {
            if ((times[i] ?? 0) >= cutoff)
                recent.push(values[i] ?? 0);
        }
        const target = slo?.target ?? 0.99;
        if (recent.length === 0) {
            return { metric, windowMs, burnRate: 0, projectedExhaustionMs: Infinity, status: 'pass' };
        }
        const goodCount = recent.filter(v => v >= target).length;
        const currentValue = goodCount / recent.length;
        const errorRate = 1 - currentValue;
        const allowedErrorRate = 1 - target;
        const burnRate = allowedErrorRate > 0 ? errorRate / allowedErrorRate : 1;
        const projectedExhaustionMs = burnRate > 0 ? windowMs / burnRate : Infinity;
        let status = 'pass';
        if (burnRate >= 1)
            status = 'fail';
        else if (burnRate >= 0.8)
            status = 'warning';
        return { metric, windowMs, burnRate, projectedExhaustionMs, status };
    }
    listSLOs() {
        return Array.from(this.slos.values());
    }
    clear() {
        this.data.clear();
        this.timestamps.clear();
    }
}
exports.SLOMonitor = SLOMonitor;
function createDefaultSLOs(monitor) {
    monitor.defineSLO('uptime', 0.999, 24 * 60 * 60 * 1000, 'Service uptime ≥ 99.9%');
    monitor.defineSLO('latency_p95', 0.95, 60 * 60 * 1000, 'Latency P95 < 500ms');
    monitor.defineSLO('throughput', 1000, 60 * 1000, 'Throughput ≥ 1000 rpm');
}
function createSLOMonitor(logger) {
    return new SLOMonitor(logger);
}
//# sourceMappingURL=slo-monitor.js.map