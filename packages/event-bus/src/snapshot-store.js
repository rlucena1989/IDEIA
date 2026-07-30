"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySnapshotStore = void 0;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('snapshot-store');
class InMemorySnapshotStore {
    snapshots = new Map();
    key(aggregateType, aggregateId) {
        return `${aggregateType}.${aggregateId}`;
    }
    saveSnapshot(aggregateType, aggregateId, state, version) {
        const snapshot = {
            aggregateType,
            aggregateId,
            state,
            version,
            timestamp: Date.now(),
        };
        this.snapshots.set(this.key(aggregateType, aggregateId), snapshot);
    }
    loadSnapshot(aggregateType, aggregateId) {
        const k = this.key(aggregateType, aggregateId);
        const snapshot = this.snapshots.get(k);
        if (snapshot === undefined) {
            return undefined;
        }
        return snapshot;
    }
    listSnapshots(aggregateType) {
        const prefix = `${aggregateType}.`;
        const result = [];
        for (const [k, snapshot] of this.snapshots) {
            if (k.startsWith(prefix)) {
                result.push(snapshot);
            }
        }
        return result.sort((a, b) => b.version - a.version);
    }
    deleteSnapshot(aggregateType, aggregateId) {
        const k = this.key(aggregateType, aggregateId);
        return this.snapshots.delete(k);
    }
}
exports.InMemorySnapshotStore = InMemorySnapshotStore;
//# sourceMappingURL=snapshot-store.js.map