"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
exports.createEventBus = createEventBus;
const crypto_1 = require("crypto");
const contracts_1 = require("@ideia/contracts");
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('event-bus');
class EventBus {
    auditTrail;
    subscriptions = new Map();
    history = [];
    maxHistory;
    logger;
    constructor(maxHistory = 1000, auditTrail, logger) {
        this.auditTrail = auditTrail;
        this.maxHistory = maxHistory;
        this.logger = logger ?? log;
    }
    async subscribe(eventType, handler, once = false) {
        const id = (0, crypto_1.randomUUID)();
        const subs = this.subscriptions.get(eventType) || [];
        subs.push({ id, eventType, handler, once });
        this.subscriptions.set(eventType, subs);
        return id;
    }
    async subscribeOnce(eventType, handler) {
        return this.subscribe(eventType, handler, true);
    }
    async unsubscribe(id) {
        for (const [type, subs] of this.subscriptions) {
            const idx = subs.findIndex(s => s.id === id);
            if (idx !== -1) {
                subs.splice(idx, 1);
                if (subs.length === 0)
                    this.subscriptions.delete(type);
                return true;
            }
        }
        return false;
    }
    async emit(event) {
        const fullEvent = {
            ...event,
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
        };
        const validation = contracts_1.Contract.pre(contracts_1.BusEventSchema, fullEvent);
        if (!validation.success) {
            this.logger.warn('Schema validation warning', { errors: validation.error.format() });
        }
        this.history.push(fullEvent);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        if (this.auditTrail) {
            try {
                await this.auditTrail.append({
                    actor: 'system',
                    eventType: event.type,
                    target: event.source,
                    decision: 'approved',
                    result: 'success',
                    metadata: { payload: event.payload }
                });
            }
            catch (_err) {
                this.logger.error('AuditTrail append error', { error: String(_err) });
            }
        }
        const wildcardSubs = this.subscriptions.get('*') || [];
        const typeSubs = this.subscriptions.get(event.type) || [];
        const allSubs = [...wildcardSubs, ...typeSubs];
        const onceSubs = [];
        for (const sub of allSubs) {
            try {
                await sub.handler(fullEvent);
            }
            catch (_err) {
                this.logger.error('Handler error', { error: String(_err), eventType: event.type });
            }
            if (sub.once)
                onceSubs.push(sub.id);
        }
        onceSubs.forEach(id => this.unsubscribe(id));
        return fullEvent;
    }
    async getHistory(eventType) {
        if (eventType)
            return this.history.filter(e => e.type === eventType);
        return [...this.history];
    }
    async clearHistory() {
        this.history = [];
    }
    async subscriberCount() {
        let count = 0;
        for (const subs of this.subscriptions.values()) {
            count += subs.length;
        }
        return count;
    }
}
exports.EventBus = EventBus;
function createEventBus(maxHistory, auditTrail, logger) {
    return new EventBus(maxHistory, auditTrail, logger);
}
//# sourceMappingURL=event-bus.js.map