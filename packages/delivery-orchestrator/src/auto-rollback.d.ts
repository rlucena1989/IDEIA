import { DeliveryOrchestrator } from './delivery-orchestrator';
import { CanaryDeployer } from './canary';
import { WebhookManager } from './webhook';
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
export declare class AutoRollbackMonitor {
    private states;
    private intervals;
    private orchestrator;
    private canaryDeployer?;
    private webhookManager?;
    private notificationManager?;
    private envConfig;
    constructor(orchestrator: DeliveryOrchestrator, deps?: {
        canaryDeployer?: CanaryDeployer;
        webhookManager?: WebhookManager;
        notificationManager?: NotificationManager;
        envConfig?: Partial<EnvHealthConfig>;
    });
    autoStartForDeploy(deployId: string, version: string, environment: 'development' | 'staging' | 'production', customConfig?: Partial<HealthCheckConfig>): AutoRollbackState;
    startMonitoring(deployId: string, version: string, rules?: AutoRollbackRule[], healthConfig?: Partial<HealthCheckConfig>): AutoRollbackState;
    stopMonitoring(deployId: string): boolean;
    getState(deployId: string): AutoRollbackState | undefined;
    listActive(): AutoRollbackState[];
    private performCheck;
    private checkEndpoint;
    private triggerRollback;
}
export declare function createAutoRollbackMonitor(orchestrator: DeliveryOrchestrator, deps?: {
    canaryDeployer?: CanaryDeployer;
    webhookManager?: WebhookManager;
}): AutoRollbackMonitor;
//# sourceMappingURL=auto-rollback.d.ts.map