"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregateRoot = void 0;
const crypto_1 = require("crypto");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('aggregate-root');
class AggregateRoot {
    id;
    version = 0;
    pendingEvents = [];
    constructor(id) {
        this.id = id;
    }
    addEvent(type, data, metadata) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            aggregateId: this.id,
            aggregateType: this.constructor.name,
            type,
            version: this.version + 1,
            data,
            metadata: {
                correlationId: metadata?.correlationId ?? (0, crypto_1.randomUUID)(),
                agentId: metadata?.agentId ?? 'system',
                timestamp: Date.now(),
                causationId: metadata?.causationId,
            },
        };
        this.pendingEvents.push(event);
        this.apply(event);
        this.version += 1;
    }
    getPendingEvents() {
        return [...this.pendingEvents];
    }
    clearPendingEvents() {
        this.pendingEvents = [];
    }
    loadFromHistory(events) {
        for (const event of events) {
            this.apply(event);
            this.version = event.version;
        }
    }
}
exports.AggregateRoot = AggregateRoot;
//# sourceMappingURL=aggregate-root.js.map