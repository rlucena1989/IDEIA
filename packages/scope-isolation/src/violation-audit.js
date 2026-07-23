"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViolationAudit = void 0;
exports.createViolationAudit = createViolationAudit;
const crypto_1 = require("crypto");
class ViolationAudit {
    events = [];
    maxEvents = 10000;
    record(event) {
        const full = {
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            ...event,
        };
        this.events.push(full);
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }
        return full;
    }
    recordFromError(error) {
        return this.record({
            fromScope: error.fromScope,
            targetPath: error.targetPath,
            resolvedPath: error.resolvedPath,
            policyAction: 'blocked',
            reason: error.message,
        });
    }
    list(scope) {
        if (!scope)
            return [...this.events];
        return this.events.filter(e => e.fromScope === scope);
    }
    count(scope) {
        if (!scope)
            return this.events.length;
        return this.events.filter(e => e.fromScope === scope).length;
    }
    recent(n) {
        return this.events.slice(-n).reverse();
    }
    clear() {
        this.events = [];
    }
}
exports.ViolationAudit = ViolationAudit;
function createViolationAudit() {
    return new ViolationAudit();
}
//# sourceMappingURL=violation-audit.js.map