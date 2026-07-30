export type GateSeverity = 'critical' | 'error' | 'warning' | 'info';
export type GateStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type VerificationLayer = 'syntax' | 'semantic' | 'functional' | 'systemic' | 'contextual';
export type FailureAction = 'block' | 'warn';

export interface GateConfig {
  name: string;
  script: string;
  action: FailureAction;
  threshold?: number;
  blocking: boolean;
}

export interface GateRunnerResult {
  name: string;
  passed: boolean;
  action: FailureAction;
  durationMs: number;
  output?: string;
  errorCount?: number;
  coverage?: number;
  testPassed?: number;
  testTotal?: number;
  testFailed?: boolean;
}

export interface GateDefinition {
  name: string;
  description: string;
  severity: GateSeverity;
  layer: VerificationLayer;
  command?: string;
  timeoutMs: number;
  blocking: boolean;
}

export interface GateResult {
  gate: string;
  status: GateStatus;
  severity: GateSeverity;
  layer: VerificationLayer;
  durationMs: number;
  output?: string;
  error?: string;
  blocking: boolean;
}

export interface LayerResult {
  layer: VerificationLayer;
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  gates: GateResult[];
}

export interface ConfidenceScore {
  overall: number;
  byLayer: Record<VerificationLayer, number>;
  gatesPassed: number;
  gatesTotal: number;
  criticalFailures: number;
  score: number;
}

export interface RegressionResult {
  hasRegression: boolean;
  newFailures: string[];
  fixedIssues: string[];
  score: number;
}

export interface BarrierDecision {
  canProceed: boolean;
  blockedBy: string[];
  warnings: string[];
  confidence: number;
}

export interface FixResult {
  success: boolean;
  fixedFiles: string[];
  errors: string[];
  durationMs: number;
  gate?: string;
  fixes?: any[];
}

export interface PipelineStatus {
  name: string;
  status: GateStatus;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  durationMs: number;
  running?: boolean;
  completed?: boolean;
}

export interface QualityScore {
  overall: number;
  byLayer: Record<VerificationLayer, number>;
  gatesPassed: number;
  gatesTotal: number;
  criticalFailures: number;
  score: number;
  breakdown?: Record<string, number>;
  weights?: Record<string, number>;
}


