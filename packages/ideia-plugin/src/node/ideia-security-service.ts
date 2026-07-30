import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { IDEIA_SecurityService, SecurityMetrics, ComplianceReport } from '../common/ideia-protocol';
import { runCompliance, ComplianceFramework } from '@ideia/policy-engine';
import { fullPolicyAudit } from '@ideia/policy-engine';
import { defaultCedarPolicies } from '@ideia/policy-engine';

@injectable()
export class IDEIA_SecurityBackendService implements IDEIA_SecurityService {

  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const reports = runCompliance();
    const policySet = defaultCedarPolicies();
    const audits = fullPolicyAudit(policySet);
    const policyAudit = audits[1] || { totalRules: 0, passed: 0, failed: 0 };
    const overallScore = reports.length > 0
      ? Math.round(reports.reduce((sum, r) => sum + r.score, 0) / reports.length)
      : 0;

    return {
      complianceReports: reports,
      policyAuditStatus: {
        total: policyAudit.totalRules,
        passed: policyAudit.passed,
        failed: policyAudit.failed,
      },
      totalPolicies: policySet.policies.length,
      lastAudit: new Date().toISOString(),
      overallScore,
    };
  }

  async runComplianceCheck(framework?: string): Promise<ComplianceReport[]> {
    const frameworks = framework ? [framework as ComplianceFramework] : undefined;
    return runCompliance(frameworks);
  }
}
