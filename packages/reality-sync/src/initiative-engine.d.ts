import { EventEmitter } from 'node:events';
export interface FixAction {
    id: string;
    type: 'file:create' | 'file:write' | 'file:delete' | 'shell:exec' | 'config:update';
    target: string;
    description: string;
    payload: string | Record<string, unknown>;
    risk: 'low' | 'medium' | 'high';
}
export interface FixPlan {
    id: string;
    actions: FixAction[];
    description: string;
    createdAt: number;
}
export interface ScanResult {
    total: number;
    fixable: number;
    unfixable: number;
    autoFixable: FixIssue[];
    requiresHuman: FixIssue[];
}
export interface FixIssue {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    category: string;
    autoFixable: boolean;
    autoFix?: FixAction[];
}
export type InitiativeLevel = 'passive' | 'assisted' | 'autonomous';
export interface InitiativeConfig {
    level: InitiativeLevel;
    riskThreshold: 'low' | 'medium' | 'high';
    autoFixCategories: string[];
}
export interface InitiativeReport {
    timestamp: number;
    scanned: number;
    fixed: number;
    failed: number;
    skipped: number;
    details: {
        id: string;
        status: 'fixed' | 'failed' | 'skipped' | 'pending';
        message: string;
    }[];
}
export declare class ProactiveInitiativeEngine extends EventEmitter {
    private workspaceRoot;
    private packagesDir;
    private docsDir;
    private verbose;
    config: InitiativeConfig;
    constructor(root: string, verbose?: boolean);
    getLevel(): InitiativeLevel;
    setLevel(level: InitiativeLevel): void;
    setAutoFixCategories(categories: string[]): void;
    setRiskThreshold(threshold: 'low' | 'medium' | 'high'): void;
    private canAutoFix;
    private log;
    private notify;
    scanAll(): ScanResult;
    private scanMissingVersions;
    private scanMissingLicense;
    private scanMissingSecurityMd;
    private scanMissingCodeOfConduct;
    private scanMissingEditorconfig;
    private scanMissingPrettierrc;
    private scanMissingNvmrc;
    private scanMissingCodeowners;
    private scanMissingFunding;
    private scanMissingSupport;
    private scanMissingGitattributes;
    private scanEnvTracked;
    private scanContributingPlaceholders;
    private scanMissingTestDirs;
    private scanStaleManifest;
    scanStudies(): {
        name: string;
        lines: number;
        hasTasks: boolean;
        hasAdr: boolean;
        hasRisks: boolean;
        hasMetrics: boolean;
        hasTimeline: boolean;
        hasTests: boolean;
        score: number;
    }[];
    private applyFix;
    runAll(): InitiativeReport;
    getScannerStatus(): {
        name: string;
        status: 'active' | 'inactive';
        lastRun?: number;
        issuesFound: number;
    }[];
    executePlan(plan: FixPlan): InitiativeReport;
    /**
     * Full proactive cycle: scan â†’ plan â†’ fix â†’ verify â†’ report
     * Respects the configured InitiativeLevel:
     *   passive:     scan only, no fixes
     *   assisted:    scan + emit suggestions, no auto-fixes
     *   autonomous:  scan + fix + verify
     */
    runCycle(): InitiativeReport;
}
//# sourceMappingURL=initiative-engine.d.ts.map