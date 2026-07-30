"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEventStore = void 0;
const logger_1 = require("@ideia/logger");
const types_event_sourcing_1 = require("./types-event-sourcing");
const logger = (0, logger_1.createLogger)('event-store');
class InMemoryEventStore {
    events = new Map();
    aggregateVersions = new Map();
    key(aggregateType, aggregateId) {
        return `${aggregateType}.${aggregateId}`;
    }
    async appendEvents(aggregateType, aggregateId, events, expectedVersion) {
        const k = this.key(aggregateType, aggregateId);
        const currentVersion = this.aggregateVersions.get(k) ?? 0;
        if (events.length === 0) {
            return;
        }
        if (expectedVersion !== currentVersion) {
            const existing = this.events.get(k) ?? [];
            const existingVersions = new Set(existing.map((e) => e.version));
            const allDuplicate = events.every((e) => existingVersions.has(e.version));
            if (allDuplicate) {
                return;
            }
            throw new types_event_sourcing_1.ConcurrencyError(`Expected version ${expectedVersion}, current ${currentVersion} for ${k}`, expectedVersion, currentVersion, aggregateType, aggregateId);
        }
        const existing = this.events.get(k) ?? [];
        this.events.set(k, [...existing, ...events]);
        this.aggregateVersions.set(k, events[events.length - 1].version);
    }
    async loadEvents(aggregateType, aggregateId) {
        const k = this.key(aggregateType, aggregateId);
        const result = this.events.get(k);
        if (result === undefined) {
            return [];
        }
        return [...result].sort((a, b) => a.version - b.version);
    }
    async loadEventsSince(aggregateType, aggregateId, fromVersion) {
        const k = this.key(aggregateType, aggregateId);
        const result = this.events.get(k);
        if (result === undefined) {
            return [];
        }
        return result
            .filter((e) => e.version > fromVersion)
            .sort((a, b) => a.version - b.version);
    }
    async *loadAllEvents(aggregateType) {
        const prefix = `${aggregateType}.`;
        for (const [k, evts] of this.events) {
            if (k.startsWith(prefix)) {
                for (const event of evts.sort((a, b) => a.version - b.version)) {
                    yield event;
                }
            }
        }
    }
    async getAggregateVersion(aggregateType, aggregateId) {
        const k = this.key(aggregateType, aggregateId);
        return this.aggregateVersions.get(k) ?? 0;
    }
}
exports.InMemoryEventStore = InMemoryEventStore;
//# sourceMappingURL=event-store.js.map