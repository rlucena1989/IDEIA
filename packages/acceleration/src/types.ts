export type EngineMode = 'fast' | 'balanced' | 'deep';
export type JobStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';
export type RiskLevel = 'low' | 'medium' | 'high';
export type TrendDirection = 'up' | 'down' | 'flat';
export type HealthStatus = 'good' | 'warning' | 'critical';
export type AlertLevel = 'info' | 'warning' | 'critical';
export type MaturityLevel = 'low' | 'medium' | 'high';

// EV-17: Coparticipativo types
export type ComplexityLevel = 'trivial' | 'simple' | 'moderate' | 'hard' | 'extreme';
export type ProviderKind = 'openai' | 'anthropic' | 'google' | 'local' | 'ollama' | 'mock';
export type ExecutionTarget = 'local' | 'remote' | 'hybrid' | 'deterministic';
export type ResourceTier = 'low' | 'medium' | 'high' | 'dedicated';

export interface HardwareProfile {
  cpuCores: number;
  cpuUsage: number;
  ramTotalGb: number;
  ramFreeGb: number;
  diskFreeGb: number;
  nodeVersion: string;
  platform: string;
}

export interface Budget {
  tokensMax: number;
  costMaxUsd: number;
  latencyMaxMs: number;
  depthMax: number;
}

export interface ProblemSpec {
  raw: string;
  fingerprint: string;
  complexity: ComplexityLevel;
  estimatedTokens: number;
  estimatedTimeMs: number;
  estimatedCostUsd: number;
  domain: string[];
  requiresExternal: boolean;
}

export interface RouteDecision {
  target: ExecutionTarget;
  provider: ProviderKind;
  model: string;
  reason: string;
  estimatedCostUsd: number;
  estimatedLatencyMs: number;
  confidence: number;
}

export interface ProviderProfile {
  kind: ProviderKind;
  name: string;
  costPer1kTokens: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  maxTokens: number;
  supportsFunctions: boolean;
  supportsStreaming: boolean;
}

export interface ConsensusResult {
  decision: string;
  confidence: number;
  participants: number;
  agreements: number;
  disagreements: number;
  details: string[];
}

export interface GuardrailsResult {
  approved: boolean;
  violations: string[];
  suggestions: string[];
}

export interface BenchmarkResult {
  provider: ProviderKind;
  model: string;
  avgLatencyMs: number;
  costPerRun: number;
  tokensUsed: number;
  successRate: number;
  score: number;
}

export interface CoParticipantReport {
  problem: ProblemSpec;
  route: RouteDecision;
  result: unknown;
  validation: GuardrailsResult;
  consensus?: ConsensusResult;
  cost: { tokens: number; costUsd: number; latencyMs: number };
  quality: number;
  timestamp: string;
}

export interface EngineConfig {
  mode: EngineMode;
  concurrency: number;
  loop: boolean;
  stopOnFailure: boolean;
  reportDir: string;
  cacheFile: string;
  stateFile: string;
  metricsFile: string;
  telemetryFile: string;
}

export interface Forecast {
  estimatedJobs: number;
  estimatedDurationMs: number;
  risk: RiskLevel;
}

export interface PrecisionReport {
  confidence: number;
  variance: number;
  stable: boolean;
}

export interface JobResult {
  id: string;
  name: string;
  status: JobStatus;
  durationMs: number;
  exitCode: number;
  attempts?: number;
  output?: string;
  error?: string;
}

export interface QualityReport {
  approved: boolean;
  score: number;
  reasons: string[];
}

export interface EngineReport {
  startedAt: string;
  finishedAt: string;
  mode: EngineMode;
  forecast: Forecast;
  precision: PrecisionReport;
  quality: QualityReport;
  scorecard: ScorecardAnalysis;
  coverage: CoverageAnalysis;
  gaps: Gap[];
  maturity: MaturityScore;
  history: HistorySummary;
  results: JobResult[];
  totalDurationMs: number;
  success: boolean;
}

export interface ScorecardAnalysis {
  score: number;
  trend: TrendDirection;
  status: HealthStatus;
}

export interface CoverageAnalysis {
  total: number;
  lines: number;
  branches: number;
  functions: number;
  status: HealthStatus;
}

export interface Gap {
  id: string;
  severity: RiskLevel;
  description: string;
}

export interface MaturityScore {
  score: number;
  level: MaturityLevel;
}

export interface EngineState {
  lastMode?: string;
  lastRunAt?: string;
  lastSuccess?: boolean;
  fingerprint?: string;
  quality?: number;
  maturity?: number;
  failures: number;
  successes: number;
}

export interface MetricEntry {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface HistorySummary {
  successRate: number;
  averageQualityScore: number;
  averageDurationMs: number;
  runs: number;
}

export interface TelemetryEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface Thresholds {
  scorecardMin: number;
  coverageMin: number;
  historySuccessMin: number;
  maturityMin: number;
}

export interface Alert {
  level: AlertLevel;
  message: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  reasons: string[];
}

export interface FeedbackDecision {
  nextMode: EngineMode;
  shouldPause: boolean;
  reason: string;
}

export interface PlannedJob {
  id: string;
  name: string;
  command: string;
  priority: number;
  dependsOn: string[];
  tags: string[];
}
