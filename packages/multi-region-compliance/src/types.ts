export type Jurisdiction = 'br' | 'eu' | 'us-general' | 'us-health' | 'global'
export type Framework = 'lgpd' | 'gdpr' | 'soc2' | 'hipaa' | 'pci-dss' | 'iso27001'
export type ComplianceLevel = 'N1' | 'N2' | 'N3' | 'N4'
export type DataCategory = 'public' | 'internal' | 'confidential' | 'restricted' | 'pii' | 'phi'

export interface JurisdictionRule {
  jurisdiction: Jurisdiction
  frameworks: Framework[]
  dataResidency: boolean
  authority: string
  consentRequired: boolean
  breachNotification: number
}

export interface ComplianceCheck {
  rule: string
  framework: Framework
  passed: boolean
  details: string
  severity: 'info' | 'warning' | 'error'
}

export interface ComplianceReport {
  timestamp: string
  jurisdiction: Jurisdiction
  frameworks: Framework[]
  checks: ComplianceCheck[]
  overallScore: number
  passed: boolean
  violations: string[]
}

export interface DataResidencyRule {
  dataCategory: DataCategory
  allowedRegions: string[]
  encryptionRequired: boolean
  retentionDays: number
}

export interface JurisdictionDetector {
  detect(ip: string, userProfile: object): Jurisdiction
}

export interface ConflictResolver {
  resolve(checks: ComplianceCheck[]): ComplianceCheck[]
}

export interface EvidenceCollector {
  collect(check: ComplianceCheck): Promise<EvidenceArtifact>
}

export interface EvidenceArtifact {
  id: string
  checkRef: string
  timestamp: string
  data: string
  hash: string
}
