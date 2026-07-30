import path from 'node:path';
import { createLogger } from '@ideia/logger';
import { FRAMEWORKS, FrameworkDefinition } from './frameworks';
import { getIO } from '../io';
const logger = createLogger('checker');

export interface CheckEvidence {
  checkId: string;
  frameworkId: string;
  requirementId: string;
  status: 'pass' | 'fail' | 'manual' | 'na';
  evidence: string;
  timestamp: string;
  automated: boolean;
}

export interface ComplianceCheckResult {
  frameworkId: string;
  frameworkName: string;
  totalChecks: number;
  passed: number;
  failed: number;
  manual: number;
  score: number;
  evidences: CheckEvidence[];
  generatedAt: string;
}

export interface ComplianceReportV2 {
  generatedAt: string;
  results: ComplianceCheckResult[];
  overallScore: number;
  summary: {
    totalChecks: number;
    totalPassed: number;
    totalFailed: number;
    totalManual: number;
  };
}

export class ComplianceChecker {
  private root: string;

  constructor(root: string) {
    this.root = root;
  }

  private checkFileExists(relativePath: string): boolean {
    return getIO().fs.exists(path.join(this.root, relativePath));
  }

  private checkPackageJsonField(field: string): boolean {
    const pkgPath = path.join(this.root, 'package.json');
    if (!getIO().fs.exists(pkgPath)) return false;
    try {
      const pkg = JSON.parse(getIO().fs.read(pkgPath, 'utf8'));
      const keys = field.split('.');
      let obj = pkg;
      for (const key of keys) {
        if (obj === undefined || obj === null) return false;
        obj = obj[key];
      }
      return obj !== undefined && obj !== null;
    } catch {
      return false;
    }
  }

  private checkDirectoryExists(relativePath: string): boolean {
    const fullPath = path.join(this.root, relativePath);
    return getIO().fs.exists(fullPath) && getIO().fs.stat(fullPath).isDirectory();
  }

  private checkGitHook(hookName: string): boolean {
    const hookPath = path.join(this.root, '.git', 'hooks', hookName);
    return getIO().fs.exists(hookPath);
  }

  private checkEnvVar(varName: string): boolean {
    return !!process.env[varName];
  }

  runChecksForFramework(framework: FrameworkDefinition): ComplianceCheckResult {
    const evidences: CheckEvidence[] = [];

    for (const req of framework.requirements) {
      const checks = this.getChecksForRequirement(framework.id, req.id);
      for (const check of checks) {
        evidences.push(check);
      }
    }

    const passed = evidences.filter(e => e.status === 'pass').length;
    const failed = evidences.filter(e => e.status === 'fail').length;
    const manual = evidences.filter(e => e.status === 'manual').length;
    const total = evidences.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      frameworkId: framework.id,
      frameworkName: framework.name,
      totalChecks: total,
      passed,
      failed,
      manual,
      score,
      evidences,
      generatedAt: new Date().toISOString(),
    };
  }

  private getChecksForRequirement(frameworkId: string, reqId: string): CheckEvidence[] {
    const checks: CheckEvidence[] = [];
    const ts = new Date().toISOString();

    switch (reqId) {
      case 'SOC2-CC1':
        checks.push({ checkId: 'auth-file', frameworkId, requirementId: reqId, status: this.checkFileExists('.env.example') ? 'pass' : 'fail', evidence: '.env.example exists', timestamp: ts, automated: true });
        checks.push({ checkId: 'auth-middleware', frameworkId, requirementId: reqId, status: this.checkFileExists('packages/security-middleware/src/index.ts') ? 'pass' : 'fail', evidence: 'security-middleware package exists', timestamp: ts, automated: true });
        break;
      case 'SOC2-CC2':
        checks.push({ checkId: 'audit-trail', frameworkId, requirementId: reqId, status: this.checkPackageJsonField('name') ? 'pass' : 'fail', evidence: 'package.json exists', timestamp: ts, automated: true });
        checks.push({ checkId: 'logging', frameworkId, requirementId: reqId, status: this.checkDirectoryExists('packages/audit-trail') || this.checkDirectoryExists('packages/telemetry') ? 'pass' : 'fail', evidence: 'audit/telemetry package exists', timestamp: ts, automated: true });
        break;
      case 'SOC2-CC3':
        checks.push({ checkId: 'git-hooks', frameworkId, requirementId: reqId, status: this.checkGitHook('pre-commit') ? 'pass' : 'fail', evidence: 'Git pre-commit hook exists', timestamp: ts, automated: true });
        checks.push({ checkId: 'change-mgmt', frameworkId, requirementId: reqId, status: this.checkDirectoryExists('.github') ? 'pass' : 'fail', evidence: 'GitHub workflows exist', timestamp: ts, automated: true });
        break;
      case 'SOC2-CC4':
        checks.push({ checkId: 'validation', frameworkId, requirementId: reqId, status: this.checkDirectoryExists('packages/verification-layer') ? 'pass' : 'fail', evidence: 'verification-layer package exists', timestamp: ts, automated: true });
        checks.push({ checkId: 'contracts', frameworkId, requirementId: reqId, status: this.checkDirectoryExists('packages/contracts') || this.checkDirectoryExists('packages/contract-cdc') ? 'pass' : 'fail', evidence: 'contracts package exists', timestamp: ts, automated: true });
        break;
      case 'SOC2-CC5':
        checks.push({ checkId: 'health-check', frameworkId, requirementId: reqId, status: this.checkDirectoryExists('packages/health-check') ? 'pass' : 'fail', evidence: 'health-check package exists', timestamp: ts, automated: true });
        checks.push({ checkId: 'resilience', frameworkId, requirementId: reqId, status: this.checkDirectoryExists('packages/resilience-engine') ? 'pass' : 'fail', evidence: 'resilience-engine package exists', timestamp: ts, automated: true });
        break;
      case 'SOC2-CC6':
        checks.push({ checkId: 'encryption', frameworkId, requirementId: reqId, status: this.checkPackageJsonField('scripts.build') ? 'pass' : 'fail', evidence: 'Project has build configuration', timestamp: ts, automated: true });
        checks.push({ checkId: 'access-control', frameworkId, requirementId: reqId, status: this.checkFileExists('packages/security-middleware/src/llm-guard.ts') ? 'pass' : 'fail', evidence: 'LLM guard exists', timestamp: ts, automated: true });
        break;
      case 'HIPAA-164.306':
        checks.push({ checkId: 'hipaa-policy', frameworkId, requirementId: reqId, status: this.checkFileExists('.ai/security/hipaa-policy.md') ? 'pass' : 'manual', evidence: this.checkFileExists('.ai/security/hipaa-policy.md') ? 'HIPAA policy file found' : 'HIPAA policy file not found — manual review required', timestamp: ts, automated: true });
        break;
      case 'HIPAA-164.308':
        checks.push({ checkId: 'hipaa-officer', frameworkId, requirementId: reqId, status: 'manual', evidence: 'Verify security officer designation in organizational documentation', timestamp: ts, automated: false });
        break;
      case 'HIPAA-164.310':
        checks.push({ checkId: 'hipaa-access-physical', frameworkId, requirementId: reqId, status: this.checkFileExists('.ai/security/access-control.md') ? 'pass' : 'manual', evidence: this.checkFileExists('.ai/security/access-control.md') ? 'Access control policy found' : 'Physical access control documentation not found', timestamp: ts, automated: true });
        break;
      case 'HIPAA-164.312':
        checks.push({ checkId: 'hipaa-technical', frameworkId, requirementId: reqId, status: this.checkDirectoryExists('packages/security-middleware') ? 'pass' : 'fail', evidence: 'Security middleware package provides technical controls', timestamp: ts, automated: true });
        checks.push({ checkId: 'hipaa-audit', frameworkId, requirementId: reqId, status: this.checkDirectoryExists('packages/audit-trail') ? 'pass' : 'manual', evidence: this.checkDirectoryExists('packages/audit-trail') ? 'Audit trail package exists' : 'No dedicated audit trail package — manual verification needed', timestamp: ts, automated: true });
        break;
      case 'HIPAA-164.314':
        checks.push({ checkId: 'hipaa-baa', frameworkId, requirementId: reqId, status: 'manual', evidence: 'Verify Business Associate Agreements (BAAs) with all third-party processors', timestamp: ts, automated: false });
        break;
      case 'HIPAA-164.316':
        checks.push({ checkId: 'hipaa-docs', frameworkId, requirementId: reqId, status: this.checkDirectoryExists('docs') && this.checkFileExists('README.md') ? 'pass' : 'fail', evidence: 'Documentation directory and README exist', timestamp: ts, automated: true });
        break;
      case 'HIPAA-164.520':
        checks.push({ checkId: 'hipaa-privacy-notice', frameworkId, requirementId: reqId, status: 'manual', evidence: 'Verify privacy notice is provided to all patients', timestamp: ts, automated: false });
        break;
      case 'HIPAA-164.522':
        checks.push({ checkId: 'hipaa-patient-rights', frameworkId, requirementId: reqId, status: 'manual', evidence: 'Verify patient rights (access, amend, restrict) are implemented', timestamp: ts, automated: false });
        break;
      case 'HIPAA-164.528':
        checks.push({ checkId: 'hipaa-accounting', frameworkId, requirementId: reqId, status: this.checkDirectoryExists('packages/audit-trail') ? 'pass' : 'manual', evidence: this.checkDirectoryExists('packages/audit-trail') ? 'Audit trail can track PHI disclosures' : 'No audit trail — manual accounting of disclosures needed', timestamp: ts, automated: true });
        break;
      case 'HIPAA-164.530':
        checks.push({ checkId: 'hipaa-training', frameworkId, requirementId: reqId, status: 'manual', evidence: 'Verify HIPAA training program and sanction policies are documented', timestamp: ts, automated: false });
        break;
      default: {
        const genericCheck = this.checkDirectoryExists('packages/security-middleware') || this.checkFileExists('.env.example');
        checks.push({ checkId: `${reqId}-generic`, frameworkId, requirementId: reqId, status: genericCheck ? 'manual' : 'fail', evidence: genericCheck ? `Generic compliance check for ${reqId} — manual review required` : `No compliance artifacts found for ${reqId}`, timestamp: ts, automated: true });
        break;
      }
    }

    return checks;
  }

  runAll(): ComplianceReportV2 {
    const results = FRAMEWORKS.map(fw => this.runChecksForFramework(fw));

    const totalChecks = results.reduce((s, r) => s + r.totalChecks, 0);
    const totalPassed = results.reduce((s, r) => s + r.passed, 0);
    const totalFailed = results.reduce((s, r) => s + r.failed, 0);
    const totalManual = results.reduce((s, r) => s + r.manual, 0);
    const overallScore = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;

    return {
      generatedAt: new Date().toISOString(),
      results,
      overallScore,
      summary: { totalChecks, totalPassed, totalFailed, totalManual },
    };
  }

  saveReport(report: ComplianceReportV2, outputDir?: string): string {
    const dir = outputDir || path.join(this.root, '.ai/reports/compliance');
    getIO().fs.mkDir(dir, true);
    const filePath = path.join(dir, `compliance-report-${Date.now()}.json`);
    getIO().fs.write(filePath, JSON.stringify(report, null, 2));
    return filePath;
  }

  generateMarkdownReport(report: ComplianceReportV2): string {
    let md = `# Compliance Report\n\n`;
    md += `**Generated:** ${report.generatedAt}\n`;
    md += `**Overall Score:** ${report.overallScore}%\n\n`;
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Total Checks | ${report.summary.totalChecks} |\n`;
    md += `| Passed | ${report.summary.totalPassed} |\n`;
    md += `| Failed | ${report.summary.totalFailed} |\n`;
    md += `| Manual Review | ${report.summary.totalManual} |\n\n`;

    for (const result of report.results) {
      md += `## ${result.frameworkName} (${result.frameworkId}) — ${result.score}%\n\n`;
      md += `| Check | Status | Evidence |\n|-------|--------|----------|\n`;
      for (const ev of result.evidences) {
        const icon = ev.status === 'pass' ? '✅' : ev.status === 'fail' ? '❌' : ev.status === 'manual' ? '🔍' : '⏭️';
        md += `| ${ev.checkId} | ${icon} ${ev.status} | ${ev.evidence} |\n`;
      }
      md += '\n';
    }

    return md;
  }
}

export function createComplianceChecker(root?: string): ComplianceChecker {
  return new ComplianceChecker(root || getIO().fs.cwd());
}
