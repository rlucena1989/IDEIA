"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionContinuityEngine = void 0;
const node_events_1 = require("node:events");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('decision-continuity');
const DEFAULT_TIMEOUTS = {
    plan: 5 * 60 * 1000,
    execution: 2 * 60 * 1000,
    policy: 10 * 60 * 1000,
    security: 15 * 60 * 1000,
    config: 3 * 60 * 1000,
};
class DecisionContinuityEngine extends node_events_1.EventEmitter {
    decisions = new Map();
    timeouts;
    escalationLevels = ['dev', 'tech-lead', 'security', 'admin'];
    timer = null;
    constructor(timeouts) {
        super();
        this.timeouts = { ...DEFAULT_TIMEOUTS, ...timeouts };
        this.startTimeoutChecker();
    }
    startTimeoutChecker() {
        this.timer = setInterval(() => {
            const now = Date.now();
            for (const [id, decision] of this.decisions) {
                if (decision.status === 'pending' && now - decision.createdAt > decision.timeoutMs) {
                    this.autoContinue(id);
                }
            }
        }, 10_000);
    }
    generateId() {
        return `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    registerDecision(decision) {
        const newDecision = {
            ...decision,
            id: this.generateId(),
            status: 'pending',
            createdAt: Date.now(),
        };
        this.decisions.set(newDecision.id, newDecision);
        this.emit('decision:registered', newDecision);
        return newDecision;
    }
    autoContinue(decisionId) {
        const decision = this.decisions.get(decisionId);
        if (!decision || decision.status !== 'pending')
            return null;
        decision.status = 'auto-approved';
        decision.resolvedAt = Date.now();
        decision.resolution = 'auto-approved by timeout';
        this.emit('decision:auto-continued', decision);
        return decision;
    }
    escalate(decisionId) {
        const decision = this.decisions.get(decisionId);
        if (!decision)
            return null;
        const currentLevel = decision.escalatedTo || 'dev';
        const currentIdx = this.escalationLevels.indexOf(currentLevel);
        if (currentIdx < this.escalationLevels.length - 1) {
            decision.escalatedTo = this.escalationLevels[currentIdx + 1];
            decision.status = 'escalated';
            this.emit('decision:escalated', decision);
        }
        else {
            decision.status = 'auto-approved';
            decision.resolvedAt = Date.now();
            decision.resolution = 'auto-approved at max escalation level';
            this.emit('decision:auto-continued', decision);
        }
        return decision;
    }
    resolve(decisionId, approved, reason) {
        const decision = this.decisions.get(decisionId);
        if (!decision)
            return null;
        decision.status = approved ? 'approved' : 'rejected';
        decision.resolvedAt = Date.now();
        decision.resolution = reason ?? (approved ? 'Approved' : 'Rejected');
        this.emit(approved ? 'decision:approved' : 'decision:rejected', decision);
        return decision;
    }
    getPendingDecisions(types) {
        const all = Array.from(this.decisions.values());
        const filtered = all.filter(d => d.status === 'pending');
        if (types)
            return filtered.filter(d => types.includes(d.type));
        return filtered;
    }
    getStatus() {
        const decisions = Array.from(this.decisions.values());
        return {
            pending: decisions.filter(d => d.status === 'pending').length,
            autoApproved: decisions.filter(d => d.status === 'auto-approved').length,
            escalated: decisions.filter(d => d.status === 'escalated').length,
            approved: decisions.filter(d => d.status === 'approved').length,
            rejected: decisions.filter(d => d.status === 'rejected').length,
            expired: decisions.filter(d => d.status === 'expired').length,
            decisions,
        };
    }
    destroy() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
exports.DecisionContinuityEngine = DecisionContinuityEngine;
//# sourceMappingURL=decision-continuity.js.map