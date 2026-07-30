import { ComplianceEngine } from '../compliance-engine'

describe('ComplianceEngine', () => {
  let engine: ComplianceEngine

  beforeEach(() => {
    engine = new ComplianceEngine()
  })

  it('should detect jurisdiction by IP', () => {
    expect(engine.detectJurisdiction('177.100.50.1')).toBe('br')
    expect(engine.detectJurisdiction('2.100.50.1')).toBe('eu')
    expect(engine.detectJurisdiction('3.100.50.1')).toBe('us-general')
    expect(engine.detectJurisdiction('10.0.0.1')).toBe('global')
  })

  it('should return jurisdiction rules', () => {
    const rules = engine.getRules('br')
    expect(rules.frameworks).toContain('lgpd')
    expect(rules.authority).toBe('ANPD')
    expect(rules.consentRequired).toBe(true)
  })

  it('should return data residency rules', () => {
    const rule = engine.getDataResidencyRule('pii')
    expect(rule.encryptionRequired).toBe(true)
    expect(rule.allowedRegions).toContain('br')
  })

  it('should run compliance checks', () => {
    const checks = engine.runChecks('eu')
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.some(c => c.rule.includes('gdpr'))).toBe(true)
    expect(checks.some(c => c.severity === 'error')).toBe(false)
  })

  it('should generate compliance report', () => {
    const report = engine.generateReport('br')
    expect(report.jurisdiction).toBe('br')
    expect(report.overallScore).toBeGreaterThan(0)
    expect(report.frameworks).toContain('lgpd')
  })

  it('should resolve conflicts between checks', () => {
    const checks = [
      { rule: 'gdpr-consent', framework: 'gdpr' as const, passed: true, details: 'Consent required', severity: 'error' as const },
      { rule: 'gdpr-consent', framework: 'lgpd' as const, passed: false, details: 'Consent not required', severity: 'warning' as const },
    ]
    const resolved = engine.resolveConflicts(checks)
    expect(resolved.length).toBe(1)
    expect(resolved[0].severity).toBe('error')
  })
})
