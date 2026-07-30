"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryDeployer = void 0;
exports.createCanaryDeployer = createCanaryDeployer;
const crypto_1 = require("crypto");
const STEPS_WEIGHT = {
    verify: 0,
    '10_percent': 10,
    '50_percent': 50,
    '100_percent': 100,
};
const DEFAULT_CANARY_CONFIG = {
    enabled: true,
    steps: ['verify', '10_percent', '50_percent', '100_percent'],
    cooldownMs: 60000,
    healthCheckEndpoint: 'http://localhost:3000/health',
    healthCheckTimeoutMs: 10000,
    autoPromote: true,
    autoRollbackOnFailure: true,
};
class CanaryDeployer {
    activeCanaries = new Map();
    config;
    constructor(config) {
        this.config = { ...DEFAULT_CANARY_CONFIG, ...config };
    }
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
    async startCanary(version, environment) {
        if (!this.config.enabled) {
            return {
                deployId: (0, crypto_1.randomUUID)(), version, environment, config: this.config,
                currentStep: '100_percent', stepResults: [], status: 'promoted',
                startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
            };
        }
        if (environment !== 'production') {
            const state = {
                deployId: (0, crypto_1.randomUUID)(), version, environment, config: this.config,
                currentStep: '100_percent', stepResults: [], status: 'promoted',
                startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
            };
            this.activeCanaries.set(state.deployId, state);
            return state;
        }
        const state = {
            deployId: (0, crypto_1.randomUUID)(), version, environment, config: this.config,
            currentStep: this.config.steps[0],
            stepResults: [], status: 'running',
            startedAt: new Date().toISOString(),
        };
        this.activeCanaries.set(state.deployId, state);
        this.runCanaryPipeline(state).catch(() => { });
        return state;
    }
    async runCanaryPipeline(state) {
        for (const step of this.config.steps) {
            if (state.status !== 'running')
                break;
            state.currentStep = step;
            const weight = STEPS_WEIGHT[step];
            const result = await this.executeStep(state, step, weight);
            state.stepResults.push(result);
            if (result.status === 'failed') {
                if (this.config.autoRollbackOnFailure) {
                    state.status = 'rolled_back';
                    state.completedAt = new Date().toISOString();
                }
                else {
                    state.status = 'failed';
                    state.completedAt = new Date().toISOString();
                }
                return;
            }
            if (step !== this.config.steps[this.config.steps.length - 1]) {
                await this.delay(this.config.cooldownMs);
            }
        }
        if (state.status === 'running') {
            state.status = 'promoted';
            state.completedAt = new Date().toISOString();
        }
    }
    async executeStep(state, step, weight) {
        const startedAt = new Date().toISOString();
        const start = Date.now();
        try {
            const healthOk = await this.checkHealth();
            if (!healthOk) {
                return {
                    step, weight, status: 'failed', durationMs: Date.now() - start,
                    error: 'Health check failed before canary step', startedAt,
                    completedAt: new Date().toISOString(),
                };
            }
            return {
                step, weight, status: 'passed', durationMs: Date.now() - start,
                startedAt, completedAt: new Date().toISOString(),
            };
        }
        catch (_err) {
            return {
                step, weight, status: 'failed', durationMs: Date.now() - start,
                error: String(_err), startedAt, completedAt: new Date().toISOString(),
            };
        }
    }
    async checkHealth() {
        try {
            const res = await fetch(this.config.healthCheckEndpoint, {
                signal: AbortSignal.timeout(this.config.healthCheckTimeoutMs),
            });
            return res.ok;
        }
        catch {
            return false;
        }
    }
    promote(deployId) {
        const state = this.activeCanaries.get(deployId);
        if (!state || state.status !== 'running')
            return false;
        state.status = 'promoted';
        state.completedAt = new Date().toISOString();
        return true;
    }
    rollback(deployId) {
        const state = this.activeCanaries.get(deployId);
        if (!state || state.status !== 'running')
            return false;
        state.status = 'rolled_back';
        state.completedAt = new Date().toISOString();
        return true;
    }
    getState(deployId) {
        return this.activeCanaries.get(deployId);
    }
    listActive() {
        return Array.from(this.activeCanaries.values())
            .filter(s => s.status === 'running');
    }
    listCompleted() {
        return Array.from(this.activeCanaries.values())
            .filter(s => s.status !== 'running');
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.CanaryDeployer = CanaryDeployer;
function createCanaryDeployer(config) {
    return new CanaryDeployer(config);
}
//# sourceMappingURL=canary.js.map