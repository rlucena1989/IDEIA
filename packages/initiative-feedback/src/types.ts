export type InitiativeEvent = 'scan.completed' | 'auto-fix.applied' | 'auto-fix.failed' | 'feedback.submitted' | 'cycle.completed';

export interface AutoFixResult {
  filePath: string;
  checkId: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  autoFixable: boolean;
  fixApplied: boolean;
  fixSuggestion?: string;
  timestamp: string;
}

export interface InitiativeCycleResult {
  scanned: number;
  fixable: number;
  applied: number;
  failed: number;
  skipped: number;
  successRate: number;
  results: AutoFixResult[];
  durationMs: number;
  timestamp: string;
}

export interface InitiativeFeedbackConfig {
  autoSubmitFixResults: boolean;
  generateRecommendations: boolean;
  maxResultsPerCycle: number;
  eventBusEnabled: boolean;
  auditTrailEnabled: boolean;
}

export interface InitiativeFeedbackStats {
  totalCycles: number;
  totalScanned: number;
  totalApplied: number;
  totalFailed: number;
  totalFixable: number;
  successRate: number;
  lastCycleDurationMs: number;
  feedbackCount: number;
  recommendationCount: number;
}

export interface RepairLoopMetrics {
  successRate: number;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  rollingWindow: number;
  meetsThreshold: boolean;
}
