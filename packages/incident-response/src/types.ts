export type IncidentSeverity = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export type IncidentType =
  | 'malware'
  | 'intrusion'
  | 'data_breach'
  | 'dos'
  | 'insider'
  | 'physical'
  | 'social_engineering'
  | 'supply_chain';

export type IncidentStatus =
  | 'preparation'
  | 'detection'
  | 'analysis'
  | 'containment'
  | 'eradication'
  | 'recovery'
  | 'post_mortem'
  | 'resolved';

export interface Incident {
  id: string;
  severity: IncidentSeverity;
  type: IncidentType;
  status: IncidentStatus;
  title: string;
  description: string;
  timestamp: number;
  detectedAt: number;
  containedAt?: number;
  eradicatedAt?: number;
  recoveredAt?: number;
  resolvedAt?: number;
  agentId: string;
  source: DetectionSource;
  violationType: string;
  violationCount: number;
  actions: ExecutedAction[];
  forensics?: ForensicEvidence;
  recovery?: RecoveryResult;
  slaStatus?: SLAStatus;
  tags: string[];
  campaignId?: string;
}

export type DetectionSource =
  | 'policy'
  | 'anomaly'
  | 'siem'
  | 'pentest'
  | 'llm-guard'
  | 'honeypot';

export interface ExecutedAction {
  type: string;
  success: boolean;
  result?: string;
  error?: string;
  timestamp: number;
}

export interface Playbook {
  id: string;
  name: string;
  incidentTypes: IncidentType[];
  severityTargets: IncidentSeverity[];
  steps: PlaybookStep[];
  validationCriteria: string[];
  estimatedDurationMs: number;
}

export interface PlaybookStep {
  order: number;
  action: string;
  params: Record<string, string>;
  expectedResult: string;
  fallback: string;
  timeoutMs: number;
}

export interface PlaybookAction {
  type: string;
  priority: number;
  detail?: string;
  channel?: string;
  message?: string;
  agentId?: string;
  workspaceId?: string;
  depth?: string;
  template?: string;
  limit?: number;
  service?: string;
  state?: string;
  scope?: string;
}

export interface PlaybookResult {
  success: boolean;
  stepResults: PlaybookStepResult[];
  durationMs: number;
  error?: string;
}

export interface PlaybookStepResult {
  stepOrder: number;
  action: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export type EvidenceType =
  | 'memory_dump'
  | 'disk_image'
  | 'network_capture'
  | 'file_snapshot'
  | 'process_list'
  | 'registry_snapshot'
  | 'log_file';

export interface ForensicEvidence {
  id: string;
  agentId: string;
  type: EvidenceType;
  timestamp: number;
  hash: string;
  size: number;
  path: string;
  chainOfCustody: ChainOfCustodyEntry[];
  metadata: Record<string, string>;
}

export interface ChainOfCustodyEntry {
  timestamp: number;
  handler: string;
  action: 'collected' | 'analyzed' | 'transferred' | 'verified' | 'presented';
  hash: string;
  notes?: string;
}

export interface RecoveryAction {
  type: string;
  target: string;
  params: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
}

export interface RecoveryPlan {
  actions: RecoveryAction[];
  estimatedDurationMs: number;
  rollbackPlan: RecoveryAction[];
}

export interface RecoveryResult {
  success: boolean;
  recoveredActions: number;
  failedActions: number;
  restoredSnapshots: string[];
  revokedSessions: number;
  integrityVerified: boolean;
  durationMs: number;
  actionDetails: RecoveryAction[];
}

export interface SLAConfig {
  severity: IncidentSeverity;
  detectTimeMs: number;
  respondTimeMs: number;
  resolveTimeMs: number;
  autoEscalate: boolean;
  escalationPath: string[];
}

export interface SLAStatus {
  severity: IncidentSeverity;
  detectTimeMs: number;
  respondTimeMs: number;
  resolveTimeMs: number;
  detectSlaMet: boolean;
  respondSlaMet: boolean;
  resolveSlaMet: boolean;
  overallSlaMet: boolean;
  breachedAt?: number;
}

export interface SLABreach {
  incidentId: string;
  severity: IncidentSeverity;
  metric: 'detect' | 'respond' | 'resolve';
  thresholdMs: number;
  actualMs: number;
  breachedAt: number;
  escalated: boolean;
}

export const SLA_DEFAULTS: Record<IncidentSeverity, SLAConfig> = {
  P0: { severity: 'P0', detectTimeMs: 300_000, respondTimeMs: 900_000, resolveTimeMs: 3_600_000, autoEscalate: true, escalationPath: ['on-call', 'security-team', 'ciso'] },
  P1: { severity: 'P1', detectTimeMs: 600_000, respondTimeMs: 1_800_000, resolveTimeMs: 7_200_000, autoEscalate: true, escalationPath: ['on-call', 'security-team'] },
  P2: { severity: 'P2', detectTimeMs: 1_800_000, respondTimeMs: 7_200_000, resolveTimeMs: 28_800_000, autoEscalate: false, escalationPath: ['security-team'] },
  P3: { severity: 'P3', detectTimeMs: 14_400_000, respondTimeMs: 43_200_000, resolveTimeMs: 172_800_000, autoEscalate: false, escalationPath: [] },
  P4: { severity: 'P4', detectTimeMs: 86_400_000, respondTimeMs: 259_200_000, resolveTimeMs: 432_000_000, autoEscalate: false, escalationPath: [] },
};

export interface ThreatIntel {
  id: string;
  source: string;
  feed: string;
  indicators: STIXIndicator[];
  confidence: number;
  receivedAt: number;
  tlp: 'white' | 'green' | 'amber' | 'red';
}

export interface STIXIndicator {
  id: string;
  type: string;
  pattern: string;
  patternType: 'stix' | 'sigma' | 'yara' | 'snort';
  validFrom: string;
  validUntil?: string;
  killChainPhases: string[];
  score: number;
  description: string;
}

export interface TAXIICollection {
  id: string;
  name: string;
  description: string;
  feedUrl: string;
  username?: string;
  password?: string;
  pollIntervalMs: number;
  lastPolledAt?: number;
  enabled: boolean;
}

export interface PostMortem {
  incidentId: string;
  title: string;
  date: string;
  severity: IncidentSeverity;
  durationMs: number;
  summary: string;
  timeline: PostMortemTimelineEntry[];
  rootCause: RootCause;
  actionItems: ActionItem[];
  lessonsLearned: string[];
  metrics: PostMortemMetrics;
  blamelessStatement: string;
}

export interface PostMortemTimelineEntry {
  timestamp: number;
  event: string;
  actor: string;
  systemResponse: string;
}

export interface RootCause {
  primaryCause: string;
  contributingFactors: string[];
  detectionGap: string;
  preventionMeasure: string;
  confidence: number;
}

export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  priority: IncidentSeverity;
  dueDate: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  verificationCriteria: string;
}

export interface PostMortemMetrics {
  mttd: number;
  mtta: number;
  mttc: number;
  mttr: number;
  slaCompliance: boolean;
}

export interface CampaignAlert {
  id: string;
  name: string;
  description: string;
  incidentIds: string[];
  severity: IncidentSeverity;
  incidentType: IncidentType;
  firstDetectedAt: number;
  lastDetectedAt: number;
  incidentCount: number;
  correlationRuleId: string;
  campaignScore: number;
  status: 'investigating' | 'confirmed' | 'mitigated' | 'false_alarm';
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  type: 'sequential' | 'temporal' | 'statistical' | 'threshold';
  conditions: CorrelationCondition[];
  timeWindowMs: number;
  threshold: number;
  severity: IncidentSeverity;
  incidentType: IncidentType;
  enabled: boolean;
}

export interface CorrelationCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
}
