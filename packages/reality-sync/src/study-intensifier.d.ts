import { EventEmitter } from 'node:events';
export interface StudyGap {
    study: string;
    filePath: string;
    missing: string[];
    currentScore: number;
    targetScore: number;
}
export interface IntensificationPlan {
    id: string;
    gaps: StudyGap[];
    totalGaps: number;
    autoFixable: StudyGap[];
    requiresHuman: StudyGap[];
    generatedAt: number;
}
export interface IntensificationReport {
    timestamp: number;
    scanned: number;
    plansGenerated: number;
    fixesApplied: number;
    fixesFailed: number;
    details: {
        study: string;
        action: string;
        status: string;
    }[];
}
export declare class StudyIntensifier extends EventEmitter {
    private workspaceRoot;
    private estudosDir;
    private verbose;
    constructor(root: string, verbose?: boolean);
    private log;
    scanGaps(): StudyGap[];
    generatePlan(gaps: StudyGap[]): IntensificationPlan;
    private appendSection;
    applyAutoFix(gap: StudyGap): boolean;
    generateAIScript(plan: IntensificationPlan, outputPath: string): string;
    runCycle(): IntensificationReport;
    private intensificationHistory;
    private autoIntensifyTimer;
    startAutoIntensify(intervalMs?: number): void;
    stopAutoIntensify(): void;
    getIntensificationHistory(): IntensificationReport[];
    rollbackLastIntensification(): {
        rolledBack: boolean;
        restoredFiles: string[];
        errors: string[];
    };
    isAutoIntensifying(): boolean;
}
//# sourceMappingURL=study-intensifier.d.ts.map