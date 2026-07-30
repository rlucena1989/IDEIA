import { Logger } from '@ideia/logger';
export type IssueType = 'feature' | 'bugfix' | 'refactor' | 'chore' | 'docs';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high';
export type CheckStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'skipped';
export type MergeStrategy = 'squash' | 'merge' | 'rebase';
export type ReviewDecision = 'approve' | 'changes_requested' | 'blocked';
export type CoverageStatus = 'green' | 'yellow' | 'red';
export type PerformanceImpact = 'low' | 'medium' | 'high';
export type FixType = 'compilation' | 'lint' | 'test' | 'coverage' | 'dependency' | 'infrastructure' | 'flaky' | 'security';
export type ApprovalLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type SecurityFindingType = 'injection' | 'xss' | 'csrf' | 'auth' | 'data_exposure' | 'dependency' | 'secret' | 'other';
export interface PRTask {
    id: string;
    description: string;
    files: string[];
    estimatedEffort: number;
}
export interface CommitPlan {
    type: string;
    scope: string;
    description: string;
    files: string[];
}
export interface ChecklistItem {
    label: string;
    required: boolean;
    applicable: boolean;
}
export interface PRPlan {
    branchName: string;
    commits: CommitPlan[];
    description: string;
    checklist: ChecklistItem[];
    tasks: PRTask[];
    risk: RiskLevel;
    estimatedEffort: number;
}
export interface Check {
    name: string;
    status: CheckStatus;
    description: string;
    url: string;
    startedAt: string;
    completedAt?: string;
}
export interface CIStatus {
    prId: string;
    status: CheckStatus;
    checks: Check[];
    url: string;
    startedAt: string;
    completedAt?: string;
}
export interface CIResult {
    prId: string;
    passed: boolean;
    checks: Check[];
    duration: number;
    url: string;
}
export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    jobId?: string;
}
export interface FailurePattern {
    type: FixType;
    pattern: string;
    description: string;
    suggestion: string;
}
export interface FixPlan {
    type: FixType;
    description: string;
    files: Array<{
        path: string;
        content: string;
        originalContent?: string;
    }>;
    attempt: number;
}
export interface FixResult {
    success: boolean;
    attempt: number;
    description: string;
    error?: string;
    appliedFixes: string[];
}
export interface QualityMetrics {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    dimensions: {
        naming: number;
        complexity: number;
        duplication: number;
        errorHandling: number;
        typeSafety: number;
        testing: number;
        documentation: number;
    };
}
export interface CoverageReport {
    status: CoverageStatus;
    totalCoverage: number;
    diffCoverage: number;
    missingTests: string[];
}
export interface SecurityFinding {
    severity: SeverityLevel;
    type: SecurityFindingType;
    file: string;
    line: number;
    description: string;
    recommendation: string;
}
export interface Suggestion {
    priority: 'high' | 'medium' | 'low';
    file?: string;
    line?: number;
    description: string;
    example?: string;
}
export interface ReviewReport {
    summary: string;
    quality: QualityMetrics;
    security: {
        passed: boolean;
        blocked: boolean;
        findings: SecurityFinding[];
        summary: string;
    };
    coverage: CoverageReport;
    performance: {
        impact: PerformanceImpact;
        details: string;
        suggestions: string[];
    };
    suggestions: Suggestion[];
    decision: ReviewDecision;
    generatedAt: string;
}
export interface ReviewComment {
    file: string;
    line: number;
    body: string;
    severity: 'info' | 'warning' | 'error';
}
export interface MergeDecision {
    canMerge: boolean;
    reason?: string;
    failedGates: string[];
    requiredApprovals: ApprovalLevel;
}
export interface MergeResult {
    merged: boolean;
    sha?: string;
    message?: string;
    error?: string;
}
export interface IssueRef {
    id: string;
    title: string;
    description: string;
    type: IssueType;
    priority: IssuePriority;
    labels?: string[];
}
export interface CodeImplementation {
    changes: Array<{
        path: string;
        content: string;
        operation: 'create' | 'modify' | 'delete';
    }>;
    commits: CommitPlan[];
}
export interface TestResults {
    passed: boolean;
    total: number;
    passedCount: number;
    failedCount: number;
    skippedCount: number;
    duration: number;
}
export interface PRResult {
    prId: string;
    plan: PRPlan;
    implementation?: CodeImplementation;
    testResults?: TestResults;
    ciStatus?: CIStatus;
    fixResult?: FixResult;
    review?: ReviewReport;
    mergeDecision?: MergeDecision;
    mergeResult?: MergeResult;
    success: boolean;
    error?: string;
    duration: number;
}
export interface PRPipelineConfig {
    logger?: Logger;
    maxFixAttempts: number;
    mergeStrategy: MergeStrategy;
    requireApproval: boolean;
    approvalLevel: ApprovalLevel;
    ciTimeout: number;
    pollInterval: number;
}
//# sourceMappingURL=types-pr.d.ts.map