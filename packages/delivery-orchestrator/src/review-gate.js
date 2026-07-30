"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewGateManager = void 0;
exports.createReviewGateManager = createReviewGateManager;
const DEFAULT_CONFIG = {
    timeoutMinutes: 120,
    escalateAfterMinutes: 60,
    autoRejectAfterMinutes: 180,
    requiredReviewers: 1,
};
class ReviewGateManager {
    pending = new Map();
    config;
    orchestrator;
    notificationManager;
    timers = new Map();
    constructor(orchestrator, config, deps) {
        this.orchestrator = orchestrator;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.notificationManager = deps?.notificationManager;
    }
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    async requestReview(deployId, version, environment) {
        const review = {
            deployId,
            version,
            environment,
            requestedAt: new Date().toISOString(),
            reviewers: [],
            approvedBy: [],
            rejectedBy: [],
            status: 'pending',
        };
        this.pending.set(deployId, review);
        if (this.notificationManager) {
            await this.notificationManager.notify({
                event: 'review.required',
                version,
                environment,
                deployId,
                metadata: { requestedAt: review.requestedAt },
            });
        }
        const escalateTimer = setTimeout(async () => {
            await this.escalate(deployId);
        }, this.config.escalateAfterMinutes * 60000);
        this.timers.set(`${deployId}-escalate`, escalateTimer);
        const rejectTimer = setTimeout(async () => {
            await this.autoReject(deployId);
        }, this.config.autoRejectAfterMinutes * 60000);
        this.timers.set(`${deployId}-reject`, rejectTimer);
        return review;
    }
    approve(deployId, reviewer, reason) {
        const review = this.pending.get(deployId);
        if (!review || review.status !== 'pending')
            return null;
        review.approvedBy.push(reviewer);
        review.notifiedAt = new Date().toISOString();
        if (review.approvedBy.length >= this.config.requiredReviewers) {
            review.status = 'approved';
            this.clearTimers(deployId);
            const request = {
                deployId,
                reviewer,
                approved: true,
                reason,
            };
            this.orchestrator.reviewGate(request);
            this.notificationManager?.notify({
                event: 'review.approved',
                version: review.version,
                environment: review.environment,
                deployId,
                metadata: { reviewer, reason },
            }).catch(() => { });
        }
        return review;
    }
    reject(deployId, reviewer, reason) {
        const review = this.pending.get(deployId);
        if (!review || review.status !== 'pending')
            return null;
        review.status = 'rejected';
        review.rejectedBy.push(reviewer);
        review.notifiedAt = new Date().toISOString();
        this.clearTimers(deployId);
        const request = {
            deployId,
            reviewer,
            approved: false,
            reason,
        };
        this.orchestrator.reviewGate(request);
        this.notificationManager?.notify({
            event: 'review.rejected',
            version: review.version,
            environment: review.environment,
            deployId,
            metadata: { reviewer, reason },
        }).catch(() => { });
        return review;
    }
    getPending(deployId) {
        return this.pending.get(deployId);
    }
    listPending(environment) {
        let result = Array.from(this.pending.values()).filter(r => r.status === 'pending');
        if (environment)
            result = result.filter(r => r.environment === environment);
        return result;
    }
    async escalate(deployId) {
        const review = this.pending.get(deployId);
        if (!review || review.status !== 'pending')
            return;
        review.escalatedAt = new Date().toISOString();
        this.notificationManager?.notify({
            event: 'review.timeout',
            version: review.version,
            environment: review.environment,
            deployId,
            metadata: {
                escalatedAt: review.escalatedAt,
                message: `Review pending for ${this.config.escalateAfterMinutes} minutes — escalation triggered`,
            },
        }).catch(() => { });
    }
    async autoReject(deployId) {
        const review = this.pending.get(deployId);
        if (!review || review.status !== 'pending')
            return;
        review.status = 'timed_out';
        review.timeoutAt = new Date().toISOString();
        this.clearTimers(deployId);
        const request = {
            deployId,
            reviewer: 'system',
            approved: false,
            reason: `Auto-rejected after ${this.config.autoRejectAfterMinutes} minutes without review`,
        };
        this.orchestrator.reviewGate(request);
        this.notificationManager?.notify({
            event: 'review.rejected',
            version: review.version,
            environment: review.environment,
            deployId,
            metadata: { reason: request.reason, autoRejected: true },
        }).catch(() => { });
    }
    clearTimers(deployId) {
        for (const key of this.timers.keys()) {
            if (key.startsWith(deployId)) {
                const timer = this.timers.get(key);
                if (timer)
                    clearTimeout(timer);
                this.timers.delete(key);
            }
        }
    }
    destroy() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.pending.clear();
    }
}
exports.ReviewGateManager = ReviewGateManager;
function createReviewGateManager(orchestrator, config, deps) {
    return new ReviewGateManager(orchestrator, config, deps);
}
//# sourceMappingURL=review-gate.js.map