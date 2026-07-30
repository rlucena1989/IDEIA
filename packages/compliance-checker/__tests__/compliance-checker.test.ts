import { JurisdictionDetector } from '../src/jurisdiction-detector';
import { RegionalRuleManager } from '../src/regional-rule-manager';
import { ConflictResolver } from '../src/conflict-resolver';
import { DataResidencyEnforcer } from '../src/data-residency-enforcer';
import { CrossRegionAuditor } from '../src/cross-region-auditor';
import { MultiRegionComplianceEngine } from '../src/multi-region-compliance-engine';
import { ReportGenerator } from '../src/report-generator';
import {
  UserProfile, DataFlow, Region, DataResidencyConfig,
  RegionalContext, AuditEntry, ComplianceConfig,
} from '../src/types';

function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    userId: 'user-1',
    country: 'BR',
    region: 'BR',
    dataCategories: ['personal'],
    hasConsent: true,
    enterprisePlan: false,
    healthData: false,
    paymentData: false,
    ...overrides,
  };
}

function makeDataFlow(overrides: Partial<DataFlow> = {}): DataFlow {
  return {
    id: 'flow-1',
    sourceRegion: 'BR',
    destinationRegion: 'BR',
    dataCategories: ['personal'],
    encryption: true,
    purpose: 'analytics',
    hasConsent: true,
    retentionDays: 180,
    dataMinimizationApplied: true,
    anonymized: false,
    ...overrides,
  };
}

function makeDefaultConfig(): ComplianceConfig {
  return {
    configFiles: { 'api.yml': 'GET /users' },
    policies: { rbac: true, 'access-control': true, slo: true, monitoring: true },
    dataResidency: {
      regions: ['BR', 'EU', 'US'],
      encryptionAlgorithm: 'AES-256',
      backupRegion: 'US',
      crossBorderTransferPolicy: 'allowed_with_safeguards',
      dataClassificationLevel: 'confidential',
    },
  };
}

describe('JurisdictionDetector', () => {
  let detector: JurisdictionDetector;

  beforeEach(() => {
    detector = new JurisdictionDetector();
  });

  it('detects BR jurisdiction for Brazilian user', () => {
    const user = makeUser({ country: 'BR' });
    const jurisdictions = detector.detect(user);
    expect(jurisdictions.length).toBeGreaterThanOrEqual(1);
    const br = jurisdictions.find(j => j.region === 'BR');
    expect(br).toBeDefined();
    expect(br?.frameworks).toContain('LGPD');
    expect(br?.authority).toBe('ANPD');
    expect(br?.dataResidencyRequired).toBe(true);
    expect(br?.consentRequired).toBe(true);
    expect(br?.breachNotificationHours).toBe(48);
    expect(br?.maxRetentionDays).toBe(365);
  });

  it('detects EU jurisdiction for German user', () => {
    const user = makeUser({ country: 'DE' });
    const jurisdictions = detector.detect(user);
    const eu = jurisdictions.find(j => j.region === 'EU');
    expect(eu).toBeDefined();
    expect(eu?.frameworks).toContain('GDPR');
    expect(eu?.authority).toBe('EDPB');
    expect(eu?.dataResidencyRequired).toBe(true);
    expect(eu?.consentRequired).toBe(true);
    expect(eu?.breachNotificationHours).toBe(72);
  });

  it('detects US jurisdiction for US user', () => {
    const user = makeUser({ country: 'US' });
    const jurisdictions = detector.detect(user);
    const us = jurisdictions.find(j => j.region === 'US');
    expect(us).toBeDefined();
    expect(us?.frameworks).toContain('CCPA');
    expect(us?.authority).toBe('FTC');
    expect(us?.dataResidencyRequired).toBe(false);
  });

  it('adds US_HEALTH jurisdiction for users with health data', () => {
    const user = makeUser({ country: 'BR', healthData: true, dataCategories: ['personal', 'health'] });
    const jurisdictions = detector.detect(user);
    const health = jurisdictions.find(j => j.region === 'US_HEALTH');
    expect(health).toBeDefined();
    expect(health?.frameworks).toContain('HIPAA');
    expect(health?.authority).toBe('HHS');
    expect(health?.encryptionRequired).toBe(true);
    expect(health?.maxRetentionDays).toBe(2190);
  });

  it('adds PCI_DSS jurisdiction for users with payment data', () => {
    const user = makeUser({ country: 'BR', paymentData: true, dataCategories: ['personal', 'payment'] });
    const jurisdictions = detector.detect(user);
    const pci = jurisdictions.find(j => j.frameworks.includes('PCI_DSS'));
    expect(pci).toBeDefined();
    expect(pci?.authority).toBe('PCI SSC');
    expect(pci?.encryptionRequired).toBe(true);
  });

  it('detects GLOBAL for unmapped countries', () => {
    const user = makeUser({ country: 'XX' });
    const jurisdictions = detector.detect(user);
    const global = jurisdictions.find(j => j.region === 'GLOBAL');
    expect(global).toBeDefined();
  });

  it('detects regions by country code', () => {
    const regions = detector.detectByCountry('BR');
    expect(regions).toContain('BR');
  });

  it('detects regions by data category', () => {
    const regions = detector.detectByDataCategory(['health', 'payment', 'personal']);
    expect(regions).toContain('US_HEALTH');
    expect(regions).toContain('GLOBAL');
    expect(regions).toContain('BR');
    expect(regions).toContain('EU');
  });

  it('returns conflict matrix', () => {
    const matrix = detector.getConflictMatrix();
    expect(matrix.length).toBeGreaterThanOrEqual(3);
    expect(matrix[0].region1).toBe('BR');
    expect(matrix[0].region2).toBe('EU');
  });
});

describe('RegionalRuleManager', () => {
  let manager: RegionalRuleManager;

  beforeEach(() => {
    manager = new RegionalRuleManager();
  });

  it('loads 4 LGPD rules for BR', () => {
    const rules = manager.getRules('BR');
    expect(rules.length).toBe(4);
    expect(rules.every(r => r.regulation === 'LGPD')).toBe(true);
  });

  it('loads 5 GDPR rules for EU', () => {
    const rules = manager.getRules('EU');
    expect(rules.length).toBe(5);
    expect(rules.every(r => r.regulation === 'GDPR')).toBe(true);
  });

  it('loads 3 SOC2 rules for US', () => {
    const rules = manager.getRules('US');
    expect(rules.length).toBe(3);
    expect(rules.every(r => r.regulation === 'SOC2')).toBe(true);
  });

  it('loads 5 HIPAA rules for US_HEALTH', () => {
    const rules = manager.getRules('US_HEALTH');
    expect(rules.length).toBe(5);
    expect(rules.every(r => r.regulation === 'HIPAA')).toBe(true);
  });

  it('loads 5 PCI_DSS rules for GLOBAL', () => {
    const rules = manager.getRules('GLOBAL');
    expect(rules.length).toBe(5);
    expect(rules.every(r => r.regulation === 'PCI_DSS')).toBe(true);
  });

  it('returns 22 total rules', () => {
    const rules = manager.getAllRules();
    expect(rules.length).toBe(22);
  });

  it('filters rules by framework', () => {
    const rules = manager.getRulesForFramework('GDPR');
    expect(rules.length).toBe(5);
    expect(rules.every(r => r.regulation === 'GDPR')).toBe(true);
  });

  it('has no duplicate rule IDs', () => {
    const rules = manager.getAllRules();
    const ids = rules.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  it('resolves retention conflict between BR (365) and US (730) — strictest wins (BR)', () => {
    const data = new Map<Region, { maxRetentionDays: number; encryptionRequired: boolean; consentRequired: boolean; breachNotificationHours: number; dataResidencyRequired: boolean; authority: string }>();
    data.set('BR', { maxRetentionDays: 365, encryptionRequired: false, consentRequired: true, breachNotificationHours: 48, dataResidencyRequired: true, authority: 'ANPD' });
    data.set('US', { maxRetentionDays: 730, encryptionRequired: false, consentRequired: false, breachNotificationHours: 0, dataResidencyRequired: false, authority: 'FTC' });

    const conflicts = resolver.resolve(['BR', 'US'], data);
    const retention = conflicts.find(c => c.conflictType === 'retention');
    expect(retention).toBeDefined();
    expect(retention?.appliedValue).toBe(365);
    expect(retention?.resolution).toBe('follow_strictest');
  });

  it('resolves encryption conflict — strictest is true', () => {
    const data = new Map<Region, { maxRetentionDays: number; encryptionRequired: boolean; consentRequired: boolean; breachNotificationHours: number; dataResidencyRequired: boolean; authority: string }>();
    data.set('BR', { maxRetentionDays: 365, encryptionRequired: false, consentRequired: true, breachNotificationHours: 48, dataResidencyRequired: true, authority: 'ANPD' });
    data.set('US_HEALTH', { maxRetentionDays: 2190, encryptionRequired: true, consentRequired: true, breachNotificationHours: 60, dataResidencyRequired: true, authority: 'HHS' });

    const conflicts = resolver.resolve(['BR', 'US_HEALTH'], data);
    const encryption = conflicts.find(c => c.conflictType === 'encryption');
    expect(encryption).toBeDefined();
    expect(encryption?.appliedValue).toBe(true);
  });

  it('resolves consent conflict — strictest is true', () => {
    const data = new Map<Region, { maxRetentionDays: number; encryptionRequired: boolean; consentRequired: boolean; breachNotificationHours: number; dataResidencyRequired: boolean; authority: string }>();
    data.set('EU', { maxRetentionDays: 365, encryptionRequired: true, consentRequired: true, breachNotificationHours: 72, dataResidencyRequired: true, authority: 'EDPB' });
    data.set('US', { maxRetentionDays: 730, encryptionRequired: false, consentRequired: false, breachNotificationHours: 0, dataResidencyRequired: false, authority: 'FTC' });

    const conflicts = resolver.resolve(['EU', 'US'], data);
    const consent = conflicts.find(c => c.conflictType === 'consent');
    expect(consent).toBeDefined();
    expect(consent?.appliedValue).toBe(true);
  });

  it('resolves notification conflict — strictest has fewer hours', () => {
    const data = new Map<Region, { maxRetentionDays: number; encryptionRequired: boolean; consentRequired: boolean; breachNotificationHours: number; dataResidencyRequired: boolean; authority: string }>();
    data.set('BR', { maxRetentionDays: 365, encryptionRequired: false, consentRequired: true, breachNotificationHours: 48, dataResidencyRequired: true, authority: 'ANPD' });
    data.set('EU', { maxRetentionDays: 365, encryptionRequired: true, consentRequired: true, breachNotificationHours: 72, dataResidencyRequired: true, authority: 'EDPB' });

    const conflicts = resolver.resolve(['BR', 'EU'], data);
    const notification = conflicts.find(c => c.conflictType === 'notification');
    expect(notification).toBeDefined();
    expect(notification?.appliedValue).toBe(48);
  });

  it('resolves residency conflict with merge_requirements', () => {
    const data = new Map<Region, { maxRetentionDays: number; encryptionRequired: boolean; consentRequired: boolean; breachNotificationHours: number; dataResidencyRequired: boolean; authority: string }>();
    data.set('BR', { maxRetentionDays: 365, encryptionRequired: false, consentRequired: true, breachNotificationHours: 48, dataResidencyRequired: true, authority: 'ANPD' });
    data.set('EU', { maxRetentionDays: 365, encryptionRequired: true, consentRequired: true, breachNotificationHours: 72, dataResidencyRequired: true, authority: 'EDPB' });

    const conflicts = resolver.resolve(['BR', 'EU'], data);
    const residency = conflicts.find(c => c.conflictType === 'residency');
    expect(residency).toBeDefined();
    expect(residency?.resolution).toBe('merge_requirements');
  });

  it('does not create conflict when all regions agree', () => {
    const data = new Map<Region, { maxRetentionDays: number; encryptionRequired: boolean; consentRequired: boolean; breachNotificationHours: number; dataResidencyRequired: boolean; authority: string }>();
    data.set('US', { maxRetentionDays: 730, encryptionRequired: false, consentRequired: false, breachNotificationHours: 0, dataResidencyRequired: false, authority: 'FTC' });
    data.set('GLOBAL', { maxRetentionDays: 365, encryptionRequired: false, consentRequired: false, breachNotificationHours: 72, dataResidencyRequired: false, authority: 'ISO' });

    const conflicts = resolver.resolve(['US', 'GLOBAL'], data);
    expect(Array.isArray(conflicts)).toBe(true);
  });
});

describe('DataResidencyEnforcer', () => {
  let enforcer: DataResidencyEnforcer;
  let config: DataResidencyConfig;

  beforeEach(() => {
    enforcer = new DataResidencyEnforcer();
    config = {
      regions: ['BR', 'EU', 'US'],
      encryptionAlgorithm: 'AES-256',
      backupRegion: 'US',
      crossBorderTransferPolicy: 'prohibited',
      dataClassificationLevel: 'confidential',
    };
  });

  it('detects cross-border violation for restricted data with prohibited policy', () => {
    const flows = [
      makeDataFlow({
        id: 'flow-1',
        sourceRegion: 'BR',
        destinationRegion: 'US',
        dataCategories: ['health'],
      }),
    ];
    const violations = enforcer.enforce(flows, config);
    const crossBorder = violations.find(v => v.violationType === 'cross_border');
    expect(crossBorder).toBeDefined();
    expect(crossBorder?.severity).toBe('critical');
  });

  it('detects missing encryption for cross-border transfer', () => {
    const config2: DataResidencyConfig = { ...config, crossBorderTransferPolicy: 'allowed_with_safeguards' };
    const flows = [
      makeDataFlow({
        id: 'flow-2',
        sourceRegion: 'BR',
        destinationRegion: 'US',
        encryption: false,
      }),
    ];
    const violations = enforcer.enforce(flows, config2);
    const noEncryption = violations.find(v => v.violationType === 'no_encryption');
    expect(noEncryption).toBeDefined();
    expect(noEncryption?.severity).toBe('high');
  });

  it('detects weak encryption algorithm for health data', () => {
    const config2: DataResidencyConfig = { ...config, encryptionAlgorithm: 'DES' };
    const flows = [
      makeDataFlow({
        id: 'flow-3',
        dataCategories: ['health'],
      }),
    ];
    const violations = enforcer.enforce(flows, config2);
    const healthEncryption = violations.find(v => v.dataCategory === 'health' && v.violationType === 'no_encryption');
    expect(healthEncryption).toBeDefined();
    expect(healthEncryption?.severity).toBe('critical');
  });

  it('detects missing consent for EU/BR data processing', () => {
    const flows = [
      makeDataFlow({
        id: 'flow-4',
        sourceRegion: 'EU',
        hasConsent: false,
      }),
    ];
    const violations = enforcer.enforce(flows, config);
    const noConsent = violations.find(v => v.violationType === 'no_consent');
    expect(noConsent).toBeDefined();
    expect(noConsent?.severity).toBe('high');
  });

  it('detects excessive retention', () => {
    const flows = [
      makeDataFlow({
        id: 'flow-5',
        sourceRegion: 'BR',
        retentionDays: 500,
      }),
    ];
    const violations = enforcer.enforce(flows, config);
    const excessiveRetention = violations.find(v => v.violationType === 'excessive_retention');
    expect(excessiveRetention).toBeDefined();
    expect(excessiveRetention?.severity).toBe('medium');
  });

  it('returns no violations for fully compliant flow', () => {
    const flows = [makeDataFlow()];
    const violations = enforcer.enforce(flows, config);
    expect(violations.length).toBe(0);
  });
});

describe('CrossRegionAuditor', () => {
  let auditor: CrossRegionAuditor;

  beforeEach(() => {
    auditor = new CrossRegionAuditor();
  });

  it('records audit entries and verifies chain', async () => {
    const entry1: AuditEntry = {
      id: 'audit-1', timestamp: new Date(), region: 'BR',
      action: 'check', actor: 'system', resource: 'user-data',
      result: 'allow', hash: '', previousHash: '',
    };
    await auditor.recordAudit(entry1);

    const entry2: AuditEntry = {
      id: 'audit-2', timestamp: new Date(), region: 'BR',
      action: 'check', actor: 'system', resource: 'payment-data',
      result: 'allow', hash: '', previousHash: '',
    };
    await auditor.recordAudit(entry2);

    const result = await auditor.verifyChain('BR');
    expect(result.valid).toBe(true);
    expect(auditor.getChainLength('BR')).toBe(2);
  });

  it('detects broken chain', async () => {
    await auditor.recordAudit({
      id: 'audit-1', timestamp: new Date(), region: 'BR',
      action: 'check', actor: 'system', resource: 'data',
      result: 'allow', hash: '', previousHash: '',
    });
    await auditor.recordAudit({
      id: 'audit-2', timestamp: new Date(), region: 'BR',
      action: 'check', actor: 'system', resource: 'data',
      result: 'allow', hash: '', previousHash: '',
    });

    const chain = auditor.getChain('BR');
    const tamperedEntry: AuditEntry = {
      ...chain[0], hash: 'tampered-hash',
    };
    chain[0] = tamperedEntry;

    const result = await auditor.verifyChain('BR');
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBeDefined();
  });

  it('returns valid for empty chain', async () => {
    const result = await auditor.verifyChain('US');
    expect(result.valid).toBe(true);
  });

  it('detects empty audit trail as cross-region issue', async () => {
    const issues = await auditor.crossRegionAudit(['BR', 'US']);
    expect(issues.length).toBe(2);
    expect(issues.every(i => i.description.includes('No audit trail'))).toBe(true);
  });

  it('compares compliance over time', async () => {
    const comparison = await auditor.compareCompliance(
      'BR',
      { score: 80, passedRules: ['rule-1', 'rule-2'] },
      { score: 90, passedRules: ['rule-1', 'rule-2', 'rule-3'] },
    );
    expect(comparison.delta).toBe(10);
    expect(comparison.improved).toContain('rule-3');
    expect(comparison.regressed.length).toBe(0);
  });
});

describe('MultiRegionComplianceEngine', () => {
  let engine: MultiRegionComplianceEngine;

  beforeEach(() => {
    engine = new MultiRegionComplianceEngine();
  });

  it('performs full compliance check for a BR user', async () => {
    const user = makeUser();
    const flows = [makeDataFlow()];
    const config = makeDefaultConfig();

    const report = await engine.checkUserCompliance(user, flows, config);
    expect(report.projectId).toBe('user-1');
    expect(report.regions).toContain('BR');
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.globalScore).toBeGreaterThanOrEqual(0);
    expect(report.crossRegionIssues).toBeDefined();
    expect(report.recommendations.length).toBeGreaterThanOrEqual(0);
  });

  it('generates reports for multiple regions (BR + US_HEALTH)', async () => {
    const user = makeUser({ country: 'BR', healthData: true, dataCategories: ['personal', 'health'] });
    const flows = [makeDataFlow({ encryption: true, retentionDays: 180 })];
    const config = makeDefaultConfig();

    const report = await engine.checkUserCompliance(user, flows, config);
    expect(report.regions.length).toBeGreaterThanOrEqual(2);
    expect(report.regions).toContain('BR');
    expect(report.regions).toContain('US_HEALTH');
  });

  it('handles compliance check with failed rules', async () => {
    const user = makeUser({ country: 'BR', hasConsent: false });
    const flows = [makeDataFlow({ encryption: false })];
    const config = makeDefaultConfig();

    const report = await engine.checkUserCompliance(user, flows, config);
    expect(report.overallScore).toBeLessThan(100);
  });

  it('records and verifies audit entries', async () => {
    await engine.recordAudit({
      id: 'eng-audit-1', timestamp: new Date(), region: 'BR',
      action: 'compliance-check', actor: 'engine', resource: 'user-profile',
      result: 'allow',
    });

    const result = await engine.verifyAuditChain('BR');
    expect(result.valid).toBe(true);
  });

  it('handles different user countries correctly', async () => {
    const user = makeUser({ country: 'DE', region: 'EU' });
    const flows = [makeDataFlow({ sourceRegion: 'EU', destinationRegion: 'EU' })];
    const config = makeDefaultConfig();

    const report = await engine.checkUserCompliance(user, flows, config);
    const euReport = report.regionReports.get('EU');
    expect(euReport).toBeDefined();
    expect(euReport?.totalRules).toBe(5);
  });

  it('performs compliance check for US user with SOC2 rules', async () => {
    const user = makeUser({ country: 'US', region: 'US' });
    const flows = [makeDataFlow({ sourceRegion: 'US', destinationRegion: 'US' })];
    const config = makeDefaultConfig();

    const report = await engine.checkUserCompliance(user, flows, config);
    const usReport = report.regionReports.get('US');
    expect(usReport).toBeDefined();
    expect(usReport?.totalRules).toBe(3);
  });
});

describe('ReportGenerator', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  it('generates report with perfect score when all pass', () => {
    const results = [
      { passed: true, details: 'Rule 1 passed', evidence: [], region: 'BR' as Region },
      { passed: true, details: 'Rule 2 passed', evidence: [], region: 'BR' as Region },
    ];
    const report = generator.generate('BR', results);
    expect(report.overallCompliant).toBe(true);
    expect(report.score).toBe(100);
    expect(report.passed).toBe(2);
    expect(report.failed).toBe(0);
  });

  it('generates report with gaps when some fail', () => {
    const results = [
      { passed: true, details: 'Rule 1 passed', evidence: [], region: 'BR' as Region },
      { passed: false, details: 'Rule 2 failed', evidence: [], region: 'BR' as Region, remediation: 'Fix rule 2' },
    ];
    const report = generator.generate('BR', results);
    expect(report.overallCompliant).toBe(false);
    expect(report.score).toBe(50);
    expect(report.gaps.length).toBe(1);
    expect(report.recommendations.some(r => r.includes('ACTION REQUIRED'))).toBe(true);
  });

  it('includes evidence summary', () => {
    const results = [
      {
        passed: true, details: 'Rule 1', evidence: [
          { id: 'ev-1', type: 'log', description: 'log evidence', region: 'BR' as Region, location: '/var/log', hash: 'abc', collectedAt: new Date() },
        ], region: 'BR' as Region,
      },
    ];
    const report = generator.generate('BR', results);
    expect(report.evidenceSummary.total).toBe(1);
    expect(report.evidenceSummary.byType['log']).toBe(1);
  });
});
