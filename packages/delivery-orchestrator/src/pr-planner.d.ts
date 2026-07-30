import { Logger } from '@ideia/logger';
import { IssueRef, PRPlan, PRTask } from './types-pr';
export declare class PRPlanner {
    private logger;
    private readonly branchPrefixes;
    constructor(logger?: Logger);
    planFromIssue(issue: IssueRef): Promise<PRPlan>;
    decomposeTask(issue: IssueRef): PRTask[];
    generateBranchName(issue: IssueRef): string;
    planReviewers(_files: string[]): string[];
    private createCommitPlan;
    private inferScope;
    private generateDescription;
    private createChecklist;
    private assessRisk;
}
//# sourceMappingURL=pr-planner.d.ts.map