"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BHPProtocol = void 0;
const node_events_1 = require("node:events");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('bhp-protocol');
const MESSAGE_TIMEOUT = 5 * 60 * 1000;
class BHPProtocol extends node_events_1.EventEmitter {
    messages = [];
    pending = new Map();
    timeoutTimer = null;
    constructor() {
        super();
        this.startTimeoutChecker();
    }
    startTimeoutChecker() {
        this.timeoutTimer = setInterval(() => {
            const now = Date.now();
            for (const [id, pending] of this.pending) {
                if (pending.status === 'pending' && now > pending.message.expiresAt) {
                    pending.status = 'expired';
                    this.emit('message:expired', { id, message: pending.message });
                }
            }
        }, 30_000);
    }
    generateId() {
        return `bhp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    sendHelp(to, from, context) {
        const msg = {
            id: this.generateId(),
            type: 'HELP',
            from,
            to,
            context,
            timestamp: Date.now(),
            expiresAt: Date.now() + MESSAGE_TIMEOUT,
        };
        this.messages.push(msg);
        this.pending.set(msg.id, { message: msg, status: 'pending' });
        this.emit('message:sent', msg);
        return msg;
    }
    sendStats(to, from, context, payload) {
        const msg = {
            id: this.generateId(),
            type: 'STATS',
            from,
            to,
            context,
            payload,
            timestamp: Date.now(),
            expiresAt: Date.now() + MESSAGE_TIMEOUT,
        };
        this.messages.push(msg);
        this.pending.set(msg.id, { message: msg, status: 'pending' });
        this.emit('message:sent', msg);
        return msg;
    }
    sendPlan(agent, plan) {
        const msg = {
            id: this.generateId(),
            type: 'PLAN',
            from: agent,
            to: 'human',
            context: 'Execution plan submitted for approval',
            payload: plan,
            timestamp: Date.now(),
            expiresAt: Date.now() + MESSAGE_TIMEOUT,
        };
        this.messages.push(msg);
        this.pending.set(msg.id, { message: msg, status: 'pending' });
        this.emit('message:sent', msg);
        return msg;
    }
    approvePlan(planId) {
        const pending = this.pending.get(planId);
        if (!pending || pending.message.type !== 'PLAN')
            return null;
        pending.status = 'approved';
        pending.respondedAt = Date.now();
        this.emit('plan:approved', { id: planId, message: pending.message });
        return this.getStatus();
    }
    rejectPlan(planId, reason) {
        const pending = this.pending.get(planId);
        if (!pending || pending.message.type !== 'PLAN')
            return null;
        pending.status = 'rejected';
        pending.respondedAt = Date.now();
        this.emit('plan:rejected', { id: planId, reason, message: pending.message });
        return this.getStatus();
    }
    sendClarify(to, from, context, payload) {
        const msg = {
            id: this.generateId(),
            type: 'CLARIFY',
            from,
            to,
            context,
            payload,
            timestamp: Date.now(),
            expiresAt: Date.now() + MESSAGE_TIMEOUT,
        };
        this.messages.push(msg);
        this.pending.set(msg.id, { message: msg, status: 'pending' });
        this.emit('message:sent', msg);
        return msg;
    }
    sendAdapt(to, from, context, payload) {
        const msg = {
            id: this.generateId(),
            type: 'ADAPT',
            from,
            to,
            context,
            payload,
            timestamp: Date.now(),
            expiresAt: Date.now() + MESSAGE_TIMEOUT,
        };
        this.messages.push(msg);
        this.pending.set(msg.id, { message: msg, status: 'pending' });
        this.emit('message:sent', msg);
        return msg;
    }
    respond(id, response) {
        const pending = this.pending.get(id);
        if (!pending)
            return;
        pending.status = 'clarified';
        pending.respondedAt = Date.now();
        this.emit('message:responded', { id, response, message: pending.message });
    }
    getStatus() {
        return {
            pendingCount: Array.from(this.pending.values()).filter(p => p.status === 'pending').length,
            lastMessage: this.messages[this.messages.length - 1] || null,
            messages: Array.from(this.pending.values()),
            queueSize: this.messages.length,
        };
    }
    getPendingPlans() {
        return Array.from(this.pending.values()).filter(p => p.message.type === 'PLAN' && p.status === 'pending');
    }
    destroy() {
        if (this.timeoutTimer) {
            clearInterval(this.timeoutTimer);
            this.timeoutTimer = null;
        }
        this.messages = [];
        this.pending.clear();
    }
}
exports.BHPProtocol = BHPProtocol;
//# sourceMappingURL=bhp-protocol.js.map