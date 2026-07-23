export type GateSeverity = 'critical' | 'error' | 'warning' | 'info';
export type GateStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type VerificationLayer = 'syntax' | 'semantic' | 'functional' | 'systemic' | 'contextual';

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
