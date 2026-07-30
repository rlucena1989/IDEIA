import { createLogger } from '@ideia/logger'
import { Jurisdiction, Framework, ComplianceCheck, ComplianceReport, JurisdictionRule, DataResidencyRule, DataCategory, ComplianceLevel } from './types'

const logger = createLogger('compliance-engine')

const JURISDICTION_RULES: Record<Jurisdiction, JurisdictionRule> = {
  br: { jurisdiction: 'br', frameworks: ['lgpd'], dataResidency: true, authority: 'ANPD', consentRequired: true, breachNotification: 72 },
  eu: { jurisdiction: 'eu', frameworks: ['gdpr'], dataResidency: true, authority: 'EDPB', consentRequired: true, breachNotification: 72 },
  'us-general': { jurisdiction: 'us-general', frameworks: ['soc2'], dataResidency: false, authority: 'AICPA', consentRequired: false, breachNotification: 168 },
  'us-health': { jurisdiction: 'us-health', frameworks: ['hipaa'], dataResidency: true, authority: 'HHS', consentRequired: true, breachNotification: 24 },
  global: { jurisdiction: 'global', frameworks: ['pci-dss', 'iso27001'], dataResidency: false, authority: 'PCI SSC', consentRequired: false, breachNotification: 72 },
}

const DATA_RESIDENCY_RULES: Record<DataCategory, DataResidencyRule> = {
  pii: { dataCategory: 'pii', allowedRegions: ['us', 'eu', 'br'], encryptionRequired: true, retentionDays: 365 },
  phi: { dataCategory: 'phi', allowedRegions: ['us'], encryptionRequired: true, retentionDays: 2555 },
  confidential: { dataCategory: 'confidential', allowedRegions: ['us', 'eu'], encryptionRequired: true, retentionDays: 730 },
  restricted: { dataCategory: 'restricted', allowedRegions: ['us', 'eu', 'br'], encryptionRequired: true, retentionDays: 1095 },
  internal: { dataCategory: 'internal', allowedRegions: ['us', 'eu', 'br', 'asia'], encryptionRequired: false, retentionDays: 365 },
  public: { dataCategory: 'public', allowedRegions: ['*'], encryptionRequired: false, retentionDays: 0 },
}

export class ComplianceEngine {
  detectJurisdiction(ip: string): Jurisdiction {
    if (ip.startsWith('177.') || ip.startsWith('189.')) return 'br'
    if (ip.startsWith('2.') || ip.startsWith('5.')) return 'eu'
    if (ip.startsWith('3.') || ip.startsWith('4.')) return 'us-general'
    return 'global'
  }

  getRules(jurisdiction: Jurisdiction): JurisdictionRule {
    return JURISDICTION_RULES[jurisdiction] || JURISDICTION_RULES.global
  }

  getDataResidencyRule(category: DataCategory): DataResidencyRule {
    return DATA_RESIDENCY_RULES[category] || DATA_RESIDENCY_RULES.internal
  }

  runChecks(jurisdiction: Jurisdiction): ComplianceCheck[] {
    const rules = this.getRules(jurisdiction)
    const checks: ComplianceCheck[] = []

    for (const framework of rules.frameworks) {
      checks.push(
        { rule: `${framework}-consent`, framework, passed: rules.consentRequired, details: `Consent ${rules.consentRequired ? 'required' : 'not required'}`, severity: 'info' },
        { rule: `${framework}-residency`, framework, passed: rules.dataResidency, details: `Data residency ${rules.dataResidency ? 'enforced' : 'not required'}`, severity: rules.dataResidency ? 'info' : 'warning' },
        { rule: `${framework}-breach-notification`, framework, passed: true, details: `Breach notification within ${rules.breachNotification}h`, severity: 'info' },
      )
    }

    logger.info(`Compliance checks run`, { jurisdiction, checks: checks.length })
    return checks
  }

  generateReport(jurisdiction: Jurisdiction): ComplianceReport {
    const rules = this.getRules(jurisdiction)
    const checks = this.runChecks(jurisdiction)
    const violations = checks.filter(c => !c.passed)
    const overallScore = checks.length > 0 ? Math.round((checks.filter(c => c.passed).length / checks.length) * 100) : 100

    return {
      timestamp: new Date().toISOString(),
      jurisdiction,
      frameworks: rules.frameworks,
      checks,
      overallScore,
      passed: violations.length === 0,
      violations: violations.map(v => v.details),
    }
  }

  resolveConflicts(checks: ComplianceCheck[]): ComplianceCheck[] {
    const existing = new Map<string, ComplianceCheck>()
    for (const check of checks) {
      const key = check.rule
      if (existing.has(key)) {
        const current = existing.get(key)!
        if (check.severity === 'error' && current.severity !== 'error') {
          existing.set(key, check)
        }
      } else {
        existing.set(key, check)
      }
    }
    return [...existing.values()]
  }
}
