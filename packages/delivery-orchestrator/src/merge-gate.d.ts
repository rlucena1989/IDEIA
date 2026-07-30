import { Logger } from '@ideia/logger';
import { MergeDecision, MergeResult, MergeStrategy, ApprovalLevel, ReviewReport, CIResult } from './types-pr';
export interface MergeGateConfig {
    strategy: MergeStrategy;
    requireApproval: boolean;
    approvalLevel: ApprovalLevel;
    deleteBranchAfterMerge: boolean;
}
export declare class MergeGate {
    private logger;
    private config;
    constructor(config?: Partial<MergeGateConfig>, logger?: Logger);
    canMerge(pr: {
        id: string;
        review?: ReviewReport;
        ciResult?: CIResult;
    }): MergeDecision;
    merge(_pr: {
        id: string;
        branch?: string;
    }, strategy?: MergeStrategy): Promise<MergeResult>;
    checkApprovals(_pr: {
        id: string;
    }): boolean;
    checkStatusChecks(_pr: {
        review?: ReviewReport;
        ciResult?: CIResult;
    }): boolean;
    enforceBranchPolicy(_branch: string): boolean;
    getConfig(): MergeGateConfig;
}
//# sourceMappingURL=merge-gate.d.ts.map