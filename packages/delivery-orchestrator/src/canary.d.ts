import { DeployEnvironment } from './types';
export type CanaryStep = 'verify' | '10_percent' | '50_percent' | '100_percent';
export interface CanaryConfig {
    enabled: boolean;
    steps: CanaryStep[];
    cooldownMs: number;
    healthCheckEndpoint: string;
    healthCheckTimeoutMs: number;
    autoPromote: boolean;
    autoRollbackOnFailure: boolean;
}
export interface CanaryState {
    deployId: string;
    version: string;
    environment: DeployEnvironment;
    config: CanaryConfig;
    currentStep: CanaryStep;
    stepResults: CanaryStepResult[];
    status: 'running' | 'promoted' | 'rolled_back' | 'failed';
    startedAt: string;
    completedAt?: string;
}
export interface CanaryStepResult {
    step: CanaryStep;
    weight: number;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
    durationMs: number;
    error?: string;
    startedAt?: string;
    completedAt?: string;
}
export declare class CanaryDeployer {
    private activeCanaries;
    private config;
    constructor(config?: Partial<CanaryConfig>);
    setConfig(config: Partial<CanaryConfig>): void;
    getConfig(): CanaryConfig;
    startCanary(version: string, environment: DeployEnvironment): Promise<CanaryState>;
    private runCanaryPipeline;
    private executeStep;
    checkHealth(): Promise<boolean>;
    promote(deployId: string): boolean;
    rollback(deployId: string): boolean;
    getState(deployId: string): CanaryState | undefined;
    listActive(): CanaryState[];
    listCompleted(): CanaryState[];
    private delay;
}
export declare function createCanaryDeployer(config?: Partial<CanaryConfig>): CanaryDeployer;
//# sourceMappingURL=canary.d.ts.map