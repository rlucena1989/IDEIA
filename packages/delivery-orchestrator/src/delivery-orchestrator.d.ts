import { DeployEntry, DeployEnvironment, DeployStatus, Incident, ReleasePlan, ReviewGateRequest, RollbackStrategy, CheckCommand } from './types';
type EventBus = {
    emit(event: {
        type: string;
        source: string;
        payload?: Record<string, unknown>;
    }): Promise<unknown>;
};
export interface DeployExecutor {
    runCommand(command: string, args: string[], timeout?: number): {
        output: string;
        code: number;
    };
    rollbackVersion(version: string, environment: DeployEnvironment): boolean;
    backupDir?: string;
}
export interface Logger {
    info(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
}
export interface DeployStepResult {
    step: string;
    success: boolean;
    durationMs: number;
    error?: string;
}
export interface DeployStatusReport {
    deployId: string;
    version: string;
    environment: DeployEnvironment;
    status: DeployStatus;
    steps: DeployStepResult[];
    startedAt: string;
    completedAt?: string;
}
export declare class DeliveryOrchestrator {
    private deploys;
    private incidents;
    private releases;
    private checks;
    private executor;
    private cwd;
    private logger;
    private deployDir;
    private eventBus?;
    constructor(options?: {
        checks?: CheckCommand[];
        executor?: DeployExecutor;
        cwd?: string;
        logger?: Logger;
        deployDir?: string;
        eventBus?: EventBus;
    });
    createRelease(version: string, environment: DeployEnvironment, artifacts: string[], autoDeploy?: boolean): ReleasePlan;
    deploy(version: string, environment: DeployEnvironment, artifacts: string[], reviewedBy?: string): DeployEntry;
    executeDeploy(version: string, environment: DeployEnvironment, artifacts: string[]): Promise<DeployStatusReport>;
    executeRollback(version: string): Promise<DeployStatusReport>;
    private runStep;
    getDeployStatus(deployId: string): DeployStatusReport | undefined;
    reviewGate(request: ReviewGateRequest): DeployEntry | null;
    rollback(deployId: string, strategy?: RollbackStrategy): DeployEntry | null;
    getDeploy(id: string): DeployEntry | undefined;
    listDeploys(environment?: DeployEnvironment): DeployEntry[];
    createIncident(data: {
        title: string;
        severity: Incident['severity'];
        description: string;
        deployId?: string;
    }): Incident;
    resolveIncident(id: string): Incident | null;
    getIncidents(severity?: Incident['severity']): Incident[];
    getReleases(): ReleasePlan[];
    setCheckCommands(checks: CheckCommand[]): void;
    private emitEvent;
    private executeDeployAsync;
}
export declare function createDeliveryOrchestrator(): DeliveryOrchestrator;
export {};
//# sourceMappingURL=delivery-orchestrator.d.ts.map