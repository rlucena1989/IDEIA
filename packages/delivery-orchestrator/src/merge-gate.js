"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeGate = void 0;
const logger_1 = require("@ideia/logger");
class MergeGate {
    logger;
    config;
    constructor(config, logger) {
        this.logger = logger ?? (0, logger_1.createLogger)('MergeGate');
        this.config = {
            strategy: 'squash',
            requireApproval: true,
            approvalLevel: 'N1',
            deleteBranchAfterMerge: true,
            ...config,
        };
    }
    canMerge(pr) {
        const failedGates = [];
        if (this.config.requireApproval) {
            const approved = this.checkApprovals(pr);
            if (!approved) {
                failedGates.push('approval');
            }
        }
        const statusChecksOk = this.checkStatusChecks(pr);
        if (!statusChecksOk) {
            failedGates.push('status_checks');
        }
        const branchPolicyOk = this.enforceBranchPolicy('main');
        if (!branchPolicyOk) {
            failedGates.push('branch_policy');
        }
        if (pr.review !== undefined && (pr.review.decision === 'blocked' || pr.review.decision === 'changes_requested')) {
            failedGates.push('review_decision');
        }
        return {
            canMerge: failedGates.length === 0,
            reason: failedGates.length > 0 ? `Failed gates: ${failedGates.join(', ')}` : undefined,
            failedGates,
            requiredApprovals: this.config.approvalLevel,
        };
    }
    async merge(_pr, strategy) {
        const mergeStrategy = strategy ?? this.config.strategy;
        this.logger.info('Executing merge', { strategy: mergeStrategy });
        return {
            merged: true,
            sha: 'abcdef1234567890',
            message: `Merge completed using ${mergeStrategy} strategy`,
        };
    }
    checkApprovals(_pr) {
        return true;
    }
    checkStatusChecks(_pr) {
        if (_pr.ciResult !== undefined && !_pr.ciResult.passed) {
            return false;
        }
        if (_pr.review !== undefined && _pr.review.decision === 'blocked') {
            return false;
        }
        return true;
    }
    enforceBranchPolicy(_branch) {
        return true;
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.MergeGate = MergeGate;
//# sourceMappingURL=merge-gate.js.map