import { Region, RegionalCheckResult, RegionalReport, RegionalGap, CrossRegionIssue } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('report-generator');

export class ReportGenerator {
  generate(region: Region, results: RegionalCheckResult[], crossRegionIssues?: CrossRegionIssue[]): RegionalReport {
    const passed = results.filter(r => r.passed).length;
    const score = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;

    const gaps: RegionalGap[] = results.filter(r => !r.passed).map(r => ({
      ruleId: r.details.substring(0, 20),
      region: r.region,
      severity: 'high',
      remediation: r.remediation ?? 'Investigate and fix',
      effortHours: 8,
    }));

    const evidenceByType: Record<string, number> = {};
    for (const r of results) {
      for (const e of r.evidence) {
        const count = evidenceByType[e.type] ?? 0;
        evidenceByType[e.type] = count + 1;
      }
    }

    return {
      region,
      overallCompliant: results.every(r => r.passed),
      totalRules: results.length,
      passed,
      failed: results.length - passed,
      score,
      results,
      gaps,
      recommendations: this.generateRecommendations(results, score, crossRegionIssues),
      evidenceSummary: {
        total: results.reduce((s, r) => s + r.evidence.length, 0),
        byType: evidenceByType,
      },
      timestamp: new Date(),
    };
  }

  private generateRecommendations(
    results: RegionalCheckResult[],
    score: number,
    crossRegionIssues?: CrossRegionIssue[],
  ): string[] {
    const recs: string[] = [];
    const failed = results.filter(r => !r.passed);
    if (failed.length > 0) recs.push(`[ACTION REQUIRED] ${failed.length} rules failed in this region`);
    if (score < 50) recs.push('[WARNING] Score below 50 — immediate remediation required');
    if (score >= 80) recs.push('[OK] Score above 80 — region compliant');

    if (crossRegionIssues && crossRegionIssues.length > 0) {
      const criticalIssues = crossRegionIssues.filter(i => i.severity === 'critical');
      const highIssues = crossRegionIssues.filter(i => i.severity === 'high');
      if (criticalIssues.length > 0) {
        recs.push(`[CRITICAL] ${criticalIssues.length} critical cross-region issues detected`);
      }
      if (highIssues.length > 0) {
        recs.push(`[HIGH] ${highIssues.length} high-severity issues require attention`);
      }
    }

    return recs;
  }
}
