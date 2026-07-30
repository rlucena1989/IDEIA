import { EarlyExitDecision, Evidence, TaskType } from '../types';
export interface EarlyExitConfig {
    minConfidence: number;
    requiredEvidence: number;
    typeThresholds: Record<string, number>;
}
export declare class EarlyExitDecider {
    private config;
    constructor(config?: Partial<EarlyExitConfig>);
    shouldExit(taskType: TaskType, evidence: Evidence[]): EarlyExitDecision;
    setConfig(config: Partial<EarlyExitConfig>): void;
}
//# sourceMappingURL=early-exit.d.ts.map