export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type Severity = 'info' | 'warning' | 'critical';

export type ApprovalLevel = 'auto' | 'semi-auto' | 'manual' | 'critical';

export type HealingActionType =
  | 'restart'
  | 'scale-up'
  | 'scale-down'
  | 'rollback'
  | 'clear-cache'
  | 'reset-rate-limit'
  | 'run-migration'
  | 'revert-config'
  | 'drain-connections'
  | 'increase-limit'
  | 'create-pr';

export type IncidentStatus =
  | 'detected'
  | 'diagnosing'
  | 'healing'
  | 'validating'
  | 'resolved'
  | 'failed'
  | 'escalated';

export type AnomalyMethod = 'zscore' | 'ewma' | 'cusum' | 'ensemble' | 'insufficient-data' | 'no-strategies';

export interface HealthMetric {
  name: string;
  value: number;
  baseline: number;
  threshold: HealthThreshold;
  timestamp: number;
  tags: Record<string, string>;
}

export interface HealthThreshold {
  warning: number;
  critical: number;
  direction: 'above' | 'below';
}

export interface HealthReport {
  overall: HealthStatus;
  metrics: HealthMetric[];
  checks: HealthCheckResult[];
  timestamp: number;
  summary: string;
}

export interface HealthCheckResult {
  name: string;
  type: 'liveness' | 'readiness' | 'deep' | 'synthetic';
  status: HealthStatus;
  latency: number;
  error?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export interface Symptom {
  metricName: string;
  currentValue: number;
  baseline: number;
  deviation: number;
  anomalyScore: number;
  method: AnomalyMethod;
  timestamp: number;
  service: string;
}

export interface RootCause {
  service: string;
  confidence: number;
  method: string;
  evidence: string[];
  suggestedAction: string;
  rank: number;
  chain: CausalLink[];
}

export interface CausalLink {
  fromService: string;
  fromMetric: string;
  toService: string;
  toMetric: string;
  correlation: number;
  lag: number;
}

export interface Confidence {
  score: number;
  factors: ConfidenceFactor[];
  timestamp: number;
}

export interface ConfidenceFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

export interface Diagnosis {
  diagnosisId: string;
  incidentId: string;
  symptoms: Symptom[];
  rootCauses: RootCause[];
  confidence: Confidence;
  timeline: TimelineEvent[];
  timestamp: number;
}

export interface TimelineEvent {
  time: number;
  event: string;
  detail: string;
}

export interface HealingAction {
  actionId: string;
  type: HealingActionType;
  target: string;
  params: Record<string, unknown>;
  risk: number;
  confidence: number;
  approval: ApprovalLevel;
  rollbackPlan: HealingAction[];
  order: number;
}

export interface HealingPlan {
  planId: string;
  incidentId: string;
  actions: HealingAction[];
  estimatedDuration: number;
  riskScore: number;
  overallConfidence: number;
  approvalLevel: ApprovalLevel;
}

export interface HealingResult {
  actionId: string;
  type: HealingActionType;
  status: 'executing' | 'success' | 'failed' | 'rolled_back';
  startTime: number;
  endTime?: number;
  output?: string;
  error?: string;
}

export interface HealingPolicy {
  policyId: string;
  name: string;
  description: string;
  cooldownRules: CooldownRule[];
  escalationRules: EscalationRule[];
  maxAttempts: number;
  autoApprovalThreshold: number;
  enabled: boolean;
  targetSelector: string;
}

export interface CooldownRule {
  actionType: HealingActionType | '*';
  cooldownMs: number;
  scope: 'service' | 'global';
}

export interface EscalationRule {
  afterAttempts: number;
  notifyChannels: string[];
  requireApproval: boolean;
  escalateTo: string;
}

export interface OrchestratorConfig {
  collectionIntervalMs: number;
  anomalyThreshold: number;
  minDataPoints: number;
  maxHistorySize: number;
  ensembleThreshold: number;
  autoExecuteThreshold: number;
  validationDelayMs: number;
  maxConcurrentIncidents: number;
  enableAutoHealing: boolean;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  timestamp: number;
  resolvedAt?: number;
  affectedServices: string[];
  metrics: Record<string, { current: number; baseline: number; anomalyScore: number }>;
  diagnosticReport?: Diagnosis;
  healingPlan?: HealingPlan;
  healingResults?: HealingResult[];
  tags: string[];
  escalatedTo?: string;
}

export interface TheiaHealthWidgetData {
  overall: HealthStatus;
  totalChecks: number;
  healthyChecks: number;
  degradedChecks: number;
  unhealthyChecks: number;
  recentIncidents: number;
  uptimePercent: number;
  lastUpdated: number;
  checks: HealthCheckResult[];
}
