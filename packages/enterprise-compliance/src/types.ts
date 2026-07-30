export type ComplianceFramework = 'soc2' | 'iso27001' | 'gdpr' | 'lgpd' | 'hipaa' | 'pci-dss';

export type ControlStatus = 'implemented' | 'partial' | 'not-implemented' | 'not-applicable';

export type ControlSeverity = 'critical' | 'high' | 'medium' | 'low';

export type EvidenceType =
  | 'configuration_snapshot'
  | 'access_review'
  | 'penetration_test'
  | 'vulnerability_scan'
  | 'training_record'
  | 'policy_acknowledgment'
  | 'audit_log'
  | 'incident_report'
  | 'change_management'
  | 'backup_verification';

export type EvidenceSource =
  | 'automated_collector'
  | 'manual_upload'
  | 'system_integration'
  | 'external_auditor'
  | 'continuous_monitor';

export type TrustPrinciple = 'security' | 'availability' | 'processing_integrity' | 'confidentiality' | 'privacy';

export type DataSubjectRight = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection' | 'automated_decisions';

export type DriftSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type RemediationPriority = 'p0' | 'p1' | 'p2' | 'p3';

export type RemediationStatus = 'open' | 'in_progress' | 'resolved' | 'accepted_risk' | 'waived';

export type ReportFormat = 'pdf' | 'json' | 'csv' | 'html' | 'xlsx';

export type MonitorState = 'healthy' | 'degraded' | 'failing' | 'unknown';

export interface Control {
  id: string;
  framework: ComplianceFramework;
  controlId: string;
  title: string;
  description: string;
  status: ControlStatus;
  severity: ControlSeverity;
  owner: string;
  category: string;
  evidenceTypes: EvidenceType[];
  lastTested: string | null;
  nextTestDue: string | null;
  remediationNotes: string | null;
  dependsOn: string[];
}

export interface FrameworkRequirement {
  id: string;
  framework: ComplianceFramework;
  requirementId: string;
  title: string;
  description: string;
  category: string;
  mandatory: boolean;
  references: string[];
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  timestamp: string;
  source: EvidenceSource;
  content: Record<string, unknown>;
  hash: string;
  metadata: Record<string, unknown>;
  retainedUntil: string;
  controlIds: string[];
  verified: boolean;
  chain: EvidenceChainEntry[];
}

export interface EvidenceChainEntry {
  id: string;
  evidenceId: string;
  action: 'created' | 'verified' |  'archived' | 'invalidated';
  timestamp: string;
  actor: string;
  hash: string;
  previousHash: string;
}

export interface EvidenceChain {
  entries: EvidenceChainEntry[];
  valid: boolean;
  lastVerified: string;
  totalEntries: number;
}

export interface AuditSection {
  id: string;
  title: string;
  description: string;
  findings: Finding[];
  framework: ComplianceFramework;
  controlCount: number;
  passingCount: number;
  score: number;
}

export interface Finding {
  id: string;
  controlId: string;
  requirementId: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  status: 'open' | 'in_remediation' | 'resolved' | 'accepted';
  framework: ComplianceFramework;
  evidenceRefs: string[];
  remediationId: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AuditReport {
  id: string;
  framework: ComplianceFramework;
  title: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  overallScore: number;
  sections: AuditSection[];
  findings: Finding[];
  evidenceCount: number;
  controlCount: number;
  passingCount: number;
  failingCount: number;
  generatedBy: string;
  metadata: Record<string, unknown>;
  remediationPlanId: string | null;
}

export interface Remediation {
  id: string;
  findingId: string;
  controlId: string;
  title: string;
  description: string;
  priority: RemediationPriority;
  status: RemediationStatus;
  owner: string;
  targetDate: string;
  completedAt: string | null;
  effortHours: number;
  notes: string | null;
  evidenceRefs: string[];
  dependsOn: string[];
}

export interface ComplianceScore {
  overall: number;
  byFramework: Partial<Record<ComplianceFramework, number>>;
  byDimension: {
    controls: number;
    evidence: number;
    testing: number;
    documentation: number;
  };
  lastUpdated: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface FrameworkDashboardEntry {
  framework: ComplianceFramework;
  score: number;
  controlCount: number;
  passingCount: number;
  failingCount: number;
  evidenceCollected: number;
  evidenceRequired: number;
  lastAssessment: string | null;
  nextAudit: string | null;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_assessed';
}

export interface ComplianceDashboardData {
  overallScore: number;
  frameworks: FrameworkDashboardEntry[];
  activeFindings: number;
  overdueRemediations: number;
  evidenceCoverage: number;
  lastUpdated: string;
  nextAuditDate: string | null;
  upcomingEvents: ComplianceEvent[];
  recentDrifts: DriftReport[];
}

export interface ComplianceEvent {
  id: string;
  title: string;
  type: 'review' | 'scan' | 'audit' | 'test' | 'certification';
  dueDate: string;
  assignee: string;
  framework: ComplianceFramework;
  completed: boolean;
}

export interface ControlMap {
  id: string;
  framework: ComplianceFramework;
  version: string;
  createdAt: string;
  updatedAt: string;
  mappings: MappedControl[];
}

export interface MappedControl {
  id: string;
  sourceControlId: string;
  sourceFramework: ComplianceFramework;
  targetRequirementId: string;
  targetFramework: ComplianceFramework;
  coverage: 'full' | 'partial' | 'related';
  notes: string | null;
  lastReviewed: string | null;
}

export interface DriftReport {
  id: string;
  controlId: string;
  framework: ComplianceFramework;
  previousStatus: ControlStatus;
  currentStatus: ControlStatus;
  detectedAt: string;
  severity: DriftSeverity;
  description: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

export interface RemediationPlan {
  id: string;
  framework: ComplianceFramework;
  title: string;
  createdAt: string;
  updatedAt: string;
  items: Remediation[];
  totalEffortHours: number;
  totalItems: number;
  completedItems: number;
  targetCompletionDate: string;
  owner: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
}

export interface ContinuousComplianceResult {
  controlId: string;
  framework: ComplianceFramework;
  passed: boolean;
  checkedAt: string;
  durationMs: number;
  details: string[];
  driftDetected: boolean;
  evidenceId: string | null;
}

export interface ComplianceCheckSummary {
  totalControls: number;
  passed: number;
  failed: number;
  driftsDetected: number;
  durationMs: number;
  timestamp: string;
  results: ContinuousComplianceResult[];
}
