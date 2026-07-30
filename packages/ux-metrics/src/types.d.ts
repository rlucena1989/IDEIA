export type NpsScore = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type SatisfactionScore = 1 | 2 | 3 | 4 | 5;
export type SusScore = number;
export type CesScore = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface NpsResponse {
    score: NpsScore;
    reason?: string;
    timestamp: string;
    sessionId: string;
}
export interface SusResponse {
    answers: number[];
    score: SusScore;
    timestamp: string;
    sessionId: string;
}
export interface CesResponse {
    taskId: string;
    taskLabel: string;
    score: CesScore;
    timestamp: string;
    sessionId: string;
    durationMs: number;
}
export interface TimeToTaskRecord {
    taskId: string;
    taskLabel: string;
    startTime: string;
    endTime: string;
    durationMs: number;
    sessionId: string;
    completed: boolean;
}
export interface PageLoadRecord {
    url: string;
    loadTimeMs: number;
    timestamp: string;
    sessionId: string;
}
export interface ErrorRecord {
    errorType: string;
    message: string;
    count: number;
    timestamp: string;
    sessionId: string;
}
export interface SatisfactionRecord {
    score: SatisfactionScore;
    context?: string;
    timestamp: string;
    sessionId: string;
}
export interface NpsReport {
    totalResponses: number;
    promoters: number;
    passives: number;
    detractors: number;
    score: number;
    normalizedScore: number;
    recentScores: NpsResponse[];
}
export interface SusReport {
    totalResponses: number;
    avgScore: number;
    minScore: number;
    maxScore: number;
    recentScores: SusResponse[];
}
export interface CesReport {
    totalResponses: number;
    avgScore: number;
    byTaskType: Record<string, {
        count: number;
        avgScore: number;
        avgDurationMs: number;
    }>;
    recentScores: CesResponse[];
}
export interface TimeToTaskReport {
    totalTasks: number;
    completedTasks: number;
    avgDurationMs: number;
    p50DurationMs: number;
    p95DurationMs: number;
    byTaskType: Record<string, {
        count: number;
        avgDurationMs: number;
    }>;
}
export interface PageLoadReport {
    totalLoads: number;
    avgLoadTimeMs: number;
    p50LoadTimeMs: number;
    p95LoadTimeMs: number;
    maxLoadTimeMs: number;
    recentLoads: PageLoadRecord[];
}
export interface ErrorReport {
    totalErrors: number;
    byType: Record<string, number>;
    recentErrors: ErrorRecord[];
}
export interface SatisfactionReport {
    totalResponses: number;
    avgScore: number;
    distribution: Record<number, number>;
    recentScores: SatisfactionRecord[];
}
export interface AccessibilityRecord {
    ruleId: string;
    score: number;
    violations: number;
    timestamp: string;
    sessionId: string;
    source: string;
}
export interface AccessibilityReport {
    totalChecks: number;
    avgScore: number;
    minScore: number;
    maxScore: number;
    bySource: Record<string, {
        count: number;
        avgScore: number;
        totalViolations: number;
    }>;
    recentRecords: AccessibilityRecord[];
}
export interface UxDashboard {
    nps: NpsReport;
    sus: SusReport;
    ces: CesReport;
    timeToTask: TimeToTaskReport;
    pageLoad: PageLoadReport;
    errors: ErrorReport;
    satisfaction: SatisfactionReport;
    a11y: AccessibilityReport;
    a11yScore: number;
    overallScore: number;
}
export interface UxAnalyticsConfig {
    storagePath: string;
    maxHistory: number;
    sessionId: string;
    useSqlite?: boolean;
}
export interface PersistedMetrics {
    nps: NpsResponse[];
    sus: SusResponse[];
    ces: CesResponse[];
    timeToTask: TimeToTaskRecord[];
    pageLoads: PageLoadRecord[];
    errors: ErrorRecord[];
    satisfaction: SatisfactionRecord[];
    a11y: AccessibilityRecord[];
    exportedAt: string;
}
export interface PerfMetric {
    name: string;
    duration: number;
    timestamp: string;
    category: PerfCategory;
}
export type PerfCategory = 'render' | 'interaction' | 'load' | 'network';
export interface PerformanceReport {
    avgRenderTime: number;
    avgInteractionTime: number;
    slowestOperations: Array<{
        name: string;
        duration: number;
    }>;
    totalMeasured: number;
    perceivedScore: number;
}
//# sourceMappingURL=types.d.ts.map