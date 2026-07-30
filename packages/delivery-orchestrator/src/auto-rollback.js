"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoRollbackMonitor = void 0;
exports.createAutoRollbackMonitor = createAutoRollbackMonitor;
const DEFAULT_HEALTH_CONFIG = {
    endpoint: 'http://localhost:3000/health',
    timeoutMs: 10000,
    intervalMs: 30000,
    maxRetries: 3,
    expectedStatus: 200,
};
const DEFAULT_RULES = [
    { name: 'health_check', metric: 'health_check', threshold: 3, windowMs: 120000, action: 'rollback' },
    { name: 'incident_critical', metric: 'incident_created', threshold: 1, windowMs: 60000, action: 'rollback' },
];
const DEFAULT_ENV_CONFIG = {
    development: { intervalMs: 60000, maxRetries: 5, endpoint: 'http://localhost:3000/health' },
    staging: { intervalMs: 30000, maxRetries: 3, endpoint: 'http://localhost:3000/health' },
    production: { intervalMs: 15000, maxRetries: 5, endpoint: 'http://localhost:3000/health' },
};
class AutoRollbackMonitor {
    states = new Map();
    intervals = new Map();
    orchestrator;
    canaryDeployer;
    webhookManager;
    notificationManager;
    envConfig;
    constructor(orchestrator, deps) {
        this.orchestrator = orchestrator;
        this.canaryDeployer = deps?.canaryDeployer;
        this.webhookManager = deps?.webhookManager;
        this.notificationManager = deps?.notificationManager;
        this.envConfig = { ...DEFAULT_ENV_CONFIG, ...deps?.envConfig };
    }
    autoStartForDeploy(deployId, version, environment, customConfig) {
        const envSpecific = this.envConfig[environment] || {};
        return this.startMonitoring(deployId, version, undefined, { ...envSpecific, ...customConfig });
    }
    startMonitoring(deployId, version, rules, healthConfig) {
        const state = {
            enabled: true,
            deployId,
            version,
            rules: rules || DEFAULT_RULES,
            healthCheckConfig: { ...DEFAULT_HEALTH_CONFIG, ...healthConfig },
            failureCount: 0,
            status: 'monitoring',
        };
        this.states.set(deployId, state);
        const intervalId = setInterval(() => {
            this.performCheck(deployId).catch(() => { });
        }, state.healthCheckConfig.intervalMs);
        this.intervals.set(deployId, intervalId);
        return state;
    }
    stopMonitoring(deployId) {
        const intervalId = this.intervals.get(deployId);
        if (intervalId) {
            clearInterval(intervalId);
            this.intervals.delete(deployId);
        }
        return this.states.delete(deployId);
    }
    getState(deployId) {
        return this.states.get(deployId);
    }
    listActive() {
        return Array.from(this.states.values())
            .filter(s => s.enabled && s.status === 'monitoring');
    }
    async performCheck(deployId) {
        const state = this.states.get(deployId);
        if (!state || !state.enabled || state.status === 'triggered')
            return;
        state.lastCheckAt = new Date().toISOString();
        const healthOk = await this.checkEndpoint(state.healthCheckConfig);
        if (!healthOk) {
            state.failureCount++;
            if (state.failureCount >= state.healthCheckConfig.maxRetries) {
                await this.triggerRollback(state);
            }
        }
        else {
            state.failureCount = 0;
        }
    }
    async checkEndpoint(config) {
        try {
            const res = await fetch(config.endpoint, {
                signal: AbortSignal.timeout(config.timeoutMs),
            });
            if (res.status !== config.expectedStatus)
                return false;
            if (config.expectedBody) {
                const body = await res.text();
                return body.includes(config.expectedBody);
            }
            return true;
        }
        catch {
            return false;
        }
    }
    async triggerRollback(state) {
        state.status = 'triggered';
        state.triggeredAt = new Date().toISOString();
        const deploy = this.orchestrator.getDeploy(state.deployId);
        if (!deploy)
            return;
        this.orchestrator.rollback(state.deployId);
        if (this.canaryDeployer) {
            this.canaryDeployer.rollback(state.deployId);
        }
        if (this.notificationManager) {
            await this.notificationManager.notify({
                event: 'health.check_failed',
                version: state.version,
                environment: deploy.environment,
                deployId: state.deployId,
                error: `${state.failureCount}/${state.healthCheckConfig.maxRetries} health checks failed`,
                metadata: { endpoint: state.healthCheckConfig.endpoint, triggeredAt: state.triggeredAt },
            });
            await this.notificationManager.notify({
                event: 'deploy.rolled_back',
                version: state.version,
                environment: deploy.environment,
                deployId: state.deployId,
                error: 'Auto-rollback triggered by health check failure',
                metadata: { autoRollback: true, failureCount: state.failureCount },
            });
        }
        if (this.webhookManager) {
            await this.webhookManager.dispatch('health.check_failed', {
                event: 'health.check_failed',
                version: state.version,
                environment: deploy.environment,
                deployId: state.deployId,
                metadata: {
                    failureCount: state.failureCount,
                    maxRetries: state.healthCheckConfig.maxRetries,
                    endpoint: state.healthCheckConfig.endpoint,
                    triggeredAt: state.triggeredAt,
                },
            });
            await this.webhookManager.dispatch('deploy.rolled_back', {
                event: 'deploy.rolled_back',
                version: state.version,
                environment: deploy.environment,
                deployId: state.deployId,
                metadata: { reason: 'Auto-rollback: health check failed', autoRollback: true },
            });
        }
    }
}
exports.AutoRollbackMonitor = AutoRollbackMonitor;
function createAutoRollbackMonitor(orchestrator, deps) {
    return new AutoRollbackMonitor(orchestrator, deps);
}
//# sourceMappingURL=auto-rollback.js.map