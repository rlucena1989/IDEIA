import { EventEmitter } from 'node:events';
export interface StudyScore {
    name: string;
    filePath: string;
    score: number;
    previousScore: number;
    missingSections: string[];
    lastScanned: number;
}
export interface MonitoringEntry {
    timestamp: number;
    averageScore: number;
    totalStudies: number;
    degraded: StudyScore[];
    improved: StudyScore[];
}
export declare class StudyScanner extends EventEmitter {
    private workspaceRoot;
    private estudosDir;
    private studyIntensifier;
    private monitoringHistory;
    private previousScores;
    private monitoringTimer;
    private verbose;
    constructor(root: string, verbose?: boolean);
    private log;
    private findEstudosDir;
    scanAll(): StudyScore[];
    startContinuousMonitoring(intervalMs?: number): void;
    stopContinuousMonitoring(): void;
    getMonitoringHistory(): MonitoringEntry[];
    getLatestScores(): StudyScore[];
    alertOnDegradation(threshold: number): void;
    isMonitoring(): boolean;
}
export declare function createStudyScanner(root: string, verbose?: boolean): StudyScanner;
//# sourceMappingURL=study-scanner.d.ts.map