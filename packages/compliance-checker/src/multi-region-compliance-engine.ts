import {
  Region, UserProfile, DataFlow, RegionalContext, RegionalCheckResult,
  ConsolidatedReport, CrossRegionIssue, AuditEntry, ComplianceConfig,
  DataResidencyConfig, DataResidencyViolation, RegionalReport,
} from './types';
import { JurisdictionDetector } from './jurisdiction-detector';
import { RegionalRuleManager } from './regional-rule-manager';
import { ConflictResolver } from './conflict-resolver';
import { DataResidencyEnforcer } from './data-residency-enforcer';
import { CrossRegionAuditor } from './cross-region-auditor';
import { ReportGenerator } from './report-generator';
import { createLogger, Logger } from '@ideia/logger';

export class MultiRegionComplianceEngine {
  private jurisdictionDetector: JurisdictionDetector;
  private ruleManager: RegionalRuleManager;
  private conflictResolver: ConflictResolver;
  private residencyEnforcer: DataResidencyEnforcer;
  private auditor: CrossRegionAuditor;
  private reportGenerator: ReportGenerator;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.jurisdictionDetector = new JurisdictionDetector();
    this.ruleManager = new RegionalRuleManager();
    this.conflictResolver = new ConflictResolver();
    this.residencyEnforcer = new DataResidencyEnforcer();
    this.auditor = new CrossRegionAuditor();
    this.reportGenerator = new ReportGenerator();
    this.logger = logger ?? createLogger('compliance-engine');
  }

  async checkCompliance(region: Region, context: RegionalContext): Promise<RegionalCheckResult[]> {
    const rules = this.ruleManager.getRules(region);
    const results: RegionalCheckResult[] = [];

    for (const rule of rules) {
      try {
        const result = await rule.check(context);
        results.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Rule check error: ${rule.id}`, { error: message });
        results.push({
          passed: false,
          details: `Error: ${message}`,
          evidence: [],
          region,
        });
      }
    }

    return results;
  }

  async checkUserCompliance(
    user: UserProfile,
    dataFlows: DataFlow[],
    config: ComplianceConfig,
  ): Promise<ConsolidatedReport> {
    const jurisdictions = this.jurisdictionDetector.detect(user);
    const regionResults = new Map<Region, RegionalCheckResult[]>();

    for (const jurisdiction of jurisdictions) {
      const ctx = this.buildRegionalContext(jurisdiction.region, [user], dataFlows, config);
      const results = await this.checkCompliance(jurisdiction.region, ctx);
      regionResults.set(jurisdiction.region, results);
    }

    const jurisdictionData = new Map<Region, {
      maxRetentionDays: number;
      encryptionRequired: boolean;
      consentRequired: boolean;
      breachNotificationHours: number;
      dataResidencyRequired: boolean;
      authority: string;
    }>();

    for (const j of jurisdictions) {
      jurisdictionData.set(j.region, {
        maxRetentionDays: j.maxRetentionDays,
        encryptionRequired: j.encryptionRequired,
        consentRequired: j.consentRequired,
        breachNotificationHours: j.breachNotificationHours,
        dataResidencyRequired: j.dataResidencyRequired,
        authority: j.authority,
      });
    }

    const allRegions = Array.from(regionResults.keys());
    const conflicts = this.conflictResolver.resolve(allRegions, jurisdictionData);

    const dataResidencyConfig = config.dataResidency ?? this.defaultResidencyConfig();
    const violations = this.residencyEnforcer.enforce(dataFlows, dataResidencyConfig);

    const reports = new Map<Region, RegionalReport>();
    for (const [region, results] of regionResults) {
      const report = this.reportGenerator.generate(region, results, []);
      reports.set(region, report);
    }

    const crossRegionIssues: CrossRegionIssue[] = [
      ...conflicts.map(c => ({
        type: 'conflict' as const,
        description: `${c.conflictType} conflict: ${c.resolution}`,
        sourceRegion: c.regions[0],
        targetRegion: c.regions.length > 1 ? c.regions[1] : c.regions[0],
        severity: 'high' as const,
        remediation: `Applied ${c.resolution}`,
      })),
      ...violations.map(v => ({
        type: this.violationTypeToIssueType(v.violationType),
        description: v.remediation,
        sourceRegion: v.sourceRegion,
        targetRegion: v.destinationRegion,
        severity: v.severity as 'critical' | 'high' | 'medium',
        remediation: v.remediation,
      })),
    ];

    const scores = Array.from(reports.values()).map(r => r.score);
    const globalScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    return {
      projectId: user.userId,
      timestamp: new Date(),
      regions: allRegions,
      overallScore: globalScore,
      regionReports: reports,
      crossRegionIssues,
      globalScore,
      recommendations: this.generateGlobalRecommendations(reports, crossRegionIssues, globalScore),
    };
  }

  async recordAudit(entry: Omit<AuditEntry, 'hash' | 'previousHash'>): Promise<void> {
    const fullEntry: AuditEntry = {
      ...entry,
      hash: '',
      previousHash: '',
    };
    await this.auditor.recordAudit(fullEntry);
  }

  async verifyAuditChain(region: Region): Promise<{ valid: boolean; brokenAt?: number }> {
    return this.auditor.verifyChain(region);
  }

  getRuleManager(): RegionalRuleManager {
    return this.ruleManager;
  }

  private buildRegionalContext(
    region: Region,
    users: UserProfile[],
    dataFlows: DataFlow[],
    config: ComplianceConfig,
  ): RegionalContext {
    return {
      projectId: 'multi-region',
      region,
      userProfiles: users,
      dataFlows,
      configFiles: config.configFiles ?? {},
      policies: config.policies ?? {},
      auditTrail: this.auditor.getChain(region),
      dataResidencyConfig: config.dataResidency ?? this.defaultResidencyConfig(region),
    };
  }

  private defaultResidencyConfig(region?: Region): DataResidencyConfig {
    return {
      regions: region ? [region] : [],
      encryptionAlgorithm: 'AES-256',
      backupRegion: region ?? 'US',
      crossBorderTransferPolicy: 'allowed_with_safeguards',
      dataClassificationLevel: 'confidential',
    };
  }

  private violationTypeToIssueType(
    violationType: DataResidencyViolation['violationType'],
  ): CrossRegionIssue['type'] {
    switch (violationType) {
      case 'cross_border': return 'residency';
      case 'no_encryption': return 'encryption_gap';
      case 'no_consent': return 'data_transfer';
      case 'excessive_retention': return 'data_transfer';
    }
  }

  private generateGlobalRecommendations(
    reports: Map<Region, RegionalReport>,
    issues: CrossRegionIssue[],
    globalScore: number,
  ): string[] {
    const recs: string[] = [];
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      recs.push(`[CRITICAL] ${criticalIssues.length} critical cross-region issues detected`);
    }
    if (highIssues.length > 0) {
      recs.push(`[HIGH] ${highIssues.length} high-severity issues require attention`);
    }
    for (const [region, report] of reports) {
      recs.push(`[${region}] Score: ${report.score}/100 - ${report.overallCompliant ? 'COMPLIANT' : 'GAPS DETECTED'}`);
    }
    recs.push(`Overall compliance score: ${globalScore}/100`);
    return recs;
  }
}
