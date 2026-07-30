import { Logger } from '@ideia/logger';

export type Region = 'BR' | 'EU' | 'US' | 'US_HEALTH' | 'GLOBAL';

export type RegulationFramework = 'LGPD' | 'GDPR' | 'SOC2' | 'HIPAA' | 'PCI_DSS' | 'CCPA' | 'ISO27001';

export type DataCategory = 'personal' | 'health' | 'financial' | 'payment' | 'biometric' | 'children';

export interface Jurisdiction {
  region: Region;
  frameworks: RegulationFramework[];
  dataResidencyRequired: boolean;
  dataResidencyRegion?: string;
  authority: string;
  consentRequired: boolean;
  breachNotificationHours: number;
  maxRetentionDays: number;
  encryptionRequired: boolean;
}

export interface UserProfile {
  userId: string;
  country: string;
  region: Region;
  dataCategories: DataCategory[];
  hasConsent: boolean;
  consentTimestamp?: Date;
  enterprisePlan: boolean;
  healthData: boolean;
  paymentData: boolean;
  age?: number;
}

export interface DataFlow {
  id: string;
  sourceRegion: Region;
  destinationRegion: Region;
  dataCategories: DataCategory[];
  encryption: boolean;
  purpose: string;
  hasConsent: boolean;
  retentionDays: number;
  dataMinimizationApplied: boolean;
  anonymized: boolean;
}

export interface RegionalRule {
  id: string;
  regulation: RegulationFramework;
  region: Region;
  article: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  check: (ctx: RegionalContext) => Promise<RegionalCheckResult>;
  conflictingRules: string[];
  stricterThan: string[];
}

export interface RegionalContext {
  projectId: string;
  region: Region;
  userProfiles: UserProfile[];
  dataFlows: DataFlow[];
  configFiles: Record<string, string>;
  policies: Record<string, unknown>;
  auditTrail: AuditEntry[];
  dataResidencyConfig: DataResidencyConfig;
}

export interface DataResidencyConfig {
  regions: Region[];
  encryptionAlgorithm: string;
  backupRegion: Region;
  crossBorderTransferPolicy: 'prohibited' | 'allowed_with_consent' | 'allowed_with_safeguards';
  dataClassificationLevel: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  region: Region;
  action: string;
  actor: string;
  resource: string;
  result: 'allow' | 'deny' | 'error';
  hash: string;
  previousHash: string;
}

export interface RegionalCheckResult {
  passed: boolean;
  details: string;
  evidence: RegionalEvidence[];
  remediation?: string;
  region: Region;
}

export interface RegionalEvidence {
  id: string;
  type: string;
  description: string;
  region: Region;
  location: string;
  hash: string;
  collectedAt: Date;
  validUntil?: Date;
}

export interface RegionalReport {
  region: Region;
  overallCompliant: boolean;
  totalRules: number;
  passed: number;
  failed: number;
  score: number;
  results: RegionalCheckResult[];
  gaps: RegionalGap[];
  recommendations: string[];
  evidenceSummary: { total: number; byType: Record<string, number> };
  timestamp: Date;
}

export interface RegionalGap {
  ruleId: string;
  region: Region;
  severity: string;
  remediation: string;
  effortHours: number;
}

export interface ConsolidatedReport {
  projectId: string;
  timestamp: Date;
  regions: Region[];
  overallScore: number;
  regionReports: Map<Region, RegionalReport>;
  crossRegionIssues: CrossRegionIssue[];
  globalScore: number;
  recommendations: string[];
}

export interface CrossRegionIssue {
  type: 'conflict' | 'data_transfer' | 'residency' | 'encryption_gap';
  description: string;
  sourceRegion: Region;
  targetRegion: Region;
  severity: 'critical' | 'high' | 'medium';
  remediation: string;
}

export interface ComplianceComparison {
  region: Region;
  previousScore: number;
  currentScore: number;
  delta: number;
  improved: string[];
  regressed: string[];
}

export interface DataResidencyViolation {
  dataFlowId: string;
  dataCategory: DataCategory;
  sourceRegion: Region;
  destinationRegion: Region;
  violationType: 'cross_border' | 'no_encryption' | 'no_consent' | 'excessive_retention';
  severity: 'critical' | 'high' | 'medium';
  remediation: string;
}

export interface ConflictResult {
  ruleId: string;
  regions: Region[];
  conflictType: 'retention' | 'encryption' | 'consent' | 'notification' | 'residency';
  resolution: 'follow_strictest' | 'follow_most_permissive' | 'merge_requirements';
  appliedValue: unknown;
  overriddenRules: string[];
}

export interface ComplianceConfig {
  configFiles?: Record<string, string>;
  policies?: Record<string, unknown>;
  dataResidency?: DataResidencyConfig;
}

export interface ComplianceEngineOptions {
  logger?: Logger;
}
