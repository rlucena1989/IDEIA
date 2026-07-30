import { DeliveryOrchestrator } from './delivery-orchestrator';
import { createLogger } from '@ideia/logger';
import { CanaryDeployer } from './canary';
import { WebhookManager, WebhookPayload } from './webhook';
import { NotificationManager } from './notifications';

export interface HealthCheckConfig {
  endpoint: string;
  timeoutMs: number;
  intervalMs: number;
  maxRetries: number;
  expectedStatus: number;
  expectedBody?: string;
}

export interface EnvHealthConfig {
  development: Partial<HealthCheckConfig>;
  staging: Partial<HealthCheckConfig>;
  production: Partial<HealthCheckConfig>;
}

export interface AutoRollbackRule {
  name: string;
  metric: 'health_check' | 'error_rate' | 'latency_p99' | 'incident_created';
  threshold: number;
  windowMs: number;
  action: 'rollback' | 'alert' | 'pause_canary';
}

export interface AutoRollbackState {
  enabled: boolean;
  deployId: string;
  version: string;
  rules: AutoRollbackRule[];
  healthCheckConfig: HealthCheckConfig;
  failureCount: number;
  lastCheckAt?: string;
  triggeredAt?: string;
  status: 'monitoring' | 'triggered' | 'resolved';
}

const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
  endpoint: 'http://localhost:3000/health',
  timeoutMs: 10000,
  intervalMs: 30000,
  maxRetries: 3,
  expectedStatus: 200,
};

const DEFAULT_RULES: AutoRollbackRule[] = [
  { name: 'health_check', metric: 'health_check', threshold: 3, windowMs: 120000, action: 'rollback' },
  { name: 'incident_critical', metric: 'incident_created', threshold: 1, windowMs: 60000, action: 'rollback' },
];

const DEFAULT_ENV_CONFIG: EnvHealthConfig = {
  development: { intervalMs: 60000, maxRetries: 5, endpoint: 'http://localhost:3000/health' },
  staging: { intervalMs: 30000, maxRetries: 3, endpoint: 'http://localhost:3000/health' },
  production: { intervalMs: 15000, maxRetries: 5, endpoint: 'http://localhost:3000/health' },
};

export class AutoRollbackMonitor {
  private states: Map<string, AutoRollbackState> = new Map();
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private orchestrator: DeliveryOrchestrator;
  private canaryDeployer?: CanaryDeployer;
  private webhookManager?: WebhookManager;
  private notificationManager?: NotificationManager;
  private envConfig: EnvHealthConfig;

  constructor(
    orchestrator: DeliveryOrchestrator,
    deps?: {
      canaryDeployer?: CanaryDeployer;
      webhookManager?: WebhookManager;
      notificationManager?: NotificationManager;
      envConfig?: Partial<EnvHealthConfig>;
    }
  ) {
    this.orchestrator = orchestrator;
    this.canaryDeployer = deps?.canaryDeployer;
    this.webhookManager = deps?.webhookManager;
    this.notificationManager = deps?.notificationManager;
    this.envConfig = { ...DEFAULT_ENV_CONFIG, ...deps?.envConfig };
  }

  autoStartForDeploy(
    deployId: string,
    version: string,
    environment: 'development' | 'staging' | 'production',
    customConfig?: Partial<HealthCheckConfig>,
  ): AutoRollbackState {
    const envSpecific = this.envConfig[environment] || {};
    return this.startMonitoring(deployId, version, undefined, { ...envSpecific, ...customConfig });
  }

  startMonitoring(
    deployId: string,
    version: string,
    rules?: AutoRollbackRule[],
    healthConfig?: Partial<HealthCheckConfig>,
  ): AutoRollbackState {
    const state: AutoRollbackState = {
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
      this.performCheck(deployId).catch(() => {});
    }, state.healthCheckConfig.intervalMs);

    this.intervals.set(deployId, intervalId);
    return state;
  }

  stopMonitoring(deployId: string): boolean {
    const intervalId = this.intervals.get(deployId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(deployId);
    }
    return this.states.delete(deployId);
  }

  getState(deployId: string): AutoRollbackState | undefined {
    return this.states.get(deployId);
  }

  listActive(): AutoRollbackState[] {
    return Array.from(this.states.values())
      .filter(s => s.enabled && s.status === 'monitoring');
  }

  private async performCheck(deployId: string): Promise<void> {
    const state = this.states.get(deployId);
    if (!state || !state.enabled || state.status === 'triggered') return;

    state.lastCheckAt = new Date().toISOString();
    const healthOk = await this.checkEndpoint(state.healthCheckConfig);

    if (!healthOk) {
      state.failureCount++;

      if (state.failureCount >= state.healthCheckConfig.maxRetries) {
        await this.triggerRollback(state);
      }
    } else {
      state.failureCount = 0;
    }
  }

  private async checkEndpoint(config: HealthCheckConfig): Promise<boolean> {
    try {
      const res = await fetch(config.endpoint, {
        signal: AbortSignal.timeout(config.timeoutMs),
      });
      if (res.status !== config.expectedStatus) return false;
      if (config.expectedBody) {
        const body = await res.text();
        return body.includes(config.expectedBody);
      }
      return true;
    } catch {
      return false;
    }
  }

  private async triggerRollback(state: AutoRollbackState): Promise<void> {
    state.status = 'triggered';
    state.triggeredAt = new Date().toISOString();

    const deploy = this.orchestrator.getDeploy(state.deployId);
    if (!deploy) return;

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

export function createAutoRollbackMonitor(
  orchestrator: DeliveryOrchestrator,
  deps?: { canaryDeployer?: CanaryDeployer; webhookManager?: WebhookManager }
): AutoRollbackMonitor {
  return new AutoRollbackMonitor(orchestrator, deps);
}
