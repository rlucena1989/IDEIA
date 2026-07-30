import { IssueRef, PRPlan, CodeImplementation, TestResults, CIStatus, FixResult, ReviewReport, MergeDecision, PRResult, PRPipelineConfig, CIResult } from './types-pr';
export declare class PRPipeline {
    private logger;
    private planner;
    private ciMonitor;
    private autoFixer;
    private reviewGenerator;
    private mergeGateInstance;
    private config;
    constructor(config?: Partial<PRPipelineConfig>);
    planPR(issue: IssueRef): Promise<PRPlan>;
    implementCode(_plan: PRPlan): Promise<CodeImplementation>;
    runTests(_implementation: CodeImplementation): Promise<TestResults>;
    monitorCI(_results: TestResults): Promise<CIStatus>;
    autoFix(failures: CIStatus): Promise<FixResult>;
    generateReview(diff: string): Promise<ReviewReport>;
    checkMergeGate(pr: {
        id: string;
        review?: ReviewReport;
        ciResult?: CIResult;
    }): Promise<MergeDecision>;
    execute(issue: IssueRef): Promise<PRResult>;
}
//# sourceMappingURL=pr-pipeline.d.ts.map