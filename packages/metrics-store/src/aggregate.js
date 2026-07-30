"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregateEngine = void 0;
const logger_1 = require("@ideia/logger");
const AGGREGATORS = {
    avg: (values) => values.reduce((a, b) => a + b, 0) / values.length,
    max: (values) => Math.max(...values),
    min: (values) => Math.min(...values),
    p95: (values) => {
        const sorted = [...values].sort((a, b) => a - b);
        const idx = Math.ceil(0.95 * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
    },
};
class AggregateEngine {
    logger = (0, logger_1.createLogger)('aggregate-engine');
    async queryMetrics(backend, name, from, to, aggregation) {
        if (from >= to) {
            this.logger.warn(`Invalid range: from ${from} >= to ${to}`);
            return { name, from, to, aggregation, value: 0, count: 0 };
        }
        return backend.queryMetrics(name, from, to, aggregation);
    }
    async queryMultiple(backend, queries) {
        const results = await Promise.all(queries.map(q => this.queryMetrics(backend, q.name, q.from, q.to, q.aggregation)));
        return results;
    }
    aggregateValues(values, type) {
        const fn = AGGREGATORS[type];
        if (!fn) {
            throw new Error(`Unknown aggregation type: ${type}`);
        }
        return fn(values);
    }
}
exports.AggregateEngine = AggregateEngine;
//# sourceMappingURL=aggregate.js.map