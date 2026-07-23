"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsolationPolicy = void 0;
exports.createIsolationPolicy = createIsolationPolicy;
const DEFAULT_POLICY = {
    crossSpaceAccess: 'block',
    bypassRequired: true,
    approvalLevel: 'tech-lead',
    dryRunFirst: true,
};
class IsolationPolicy {
    config;
    constructor(config) {
        this.config = { ...DEFAULT_POLICY, ...config };
    }
    get crossSpaceAccess() {
        return this.config.crossSpaceAccess;
    }
    get bypassRequired() {
        return this.config.bypassRequired;
    }
    get approvalLevel() {
        return this.config.approvalLevel;
    }
    get dryRunFirst() {
        return this.config.dryRunFirst;
    }
    toConfig() {
        return { ...this.config };
    }
    evaluate(source, target) {
        if (source === target) {
            return {
                allowed: true,
                bypassRequired: false,
                approvalLevel: this.config.approvalLevel,
                reason: `Same-scope access (${source} → ${target}): allowed`,
            };
        }
        if (this.config.dryRunFirst) {
            return {
                allowed: false,
                bypassRequired: true,
                approvalLevel: this.config.approvalLevel,
                reason: `Cross-scope access needs dry-run first (${source} → ${target})`,
            };
        }
        if (this.config.crossSpaceAccess === 'block') {
            return {
                allowed: false,
                bypassRequired: true,
                approvalLevel: this.config.approvalLevel,
                reason: `Cross-space access blocked by policy (${source} → ${target})`,
            };
        }
        if (this.config.crossSpaceAccess === 'allow-with-bypass' && this.config.bypassRequired) {
            return {
                allowed: true,
                bypassRequired: true,
                approvalLevel: this.config.approvalLevel,
                reason: `Cross-space access requires ${this.config.approvalLevel} approval (${source} → ${target})`,
            };
        }
        return {
            allowed: false,
            bypassRequired: true,
            approvalLevel: this.config.approvalLevel,
            reason: `Unknown policy state (${source} → ${target})`,
        };
    }
    update(config) {
        this.config = { ...this.config, ...config };
    }
}
exports.IsolationPolicy = IsolationPolicy;
function createIsolationPolicy(config) {
    return new IsolationPolicy(config);
}
//# sourceMappingURL=isolation-policy.js.map