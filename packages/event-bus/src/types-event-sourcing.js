"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcurrencyError = void 0;
class ConcurrencyError extends Error {
    expectedVersion;
    actualVersion;
    aggregateType;
    aggregateId;
    constructor(message, expectedVersion, actualVersion, aggregateType, aggregateId) {
        super(message);
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        this.name = 'ConcurrencyError';
    }
}
exports.ConcurrencyError = ConcurrencyError;
//# sourceMappingURL=types-event-sourcing.js.map