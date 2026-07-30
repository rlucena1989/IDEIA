import { createLogger, Logger } from '@ideia/logger';
import {
  ComplianceFramework,
  ComplianceDashboardData,
  FrameworkDashboardEntry,
  ComplianceEvent,
  DriftReport,
  ComplianceScore,
  Control,
  Evidence,
  ControlStatus,
} from './types';

export class ComplianceDashboard {
  private _logger: Logger;

  constructor() {
    this._logger = createLogger('compliance-dashboard');
  }

  buildDashboard(
    controls: Control[],
    evidence: Evidence[],
    score: ComplianceScore,
    drifts: DriftReport[],
    events: ComplianceEvent[],
  ): ComplianceDashboardData {
    const frameworks: ComplianceFramework[] = ['soc2', 'iso27001', 'gdpr', 'lgpd', 'hipaa', 'pci-dss'];
    const frameworkEntries = this._buildFrameworkEntries(frameworks, controls, evidence);
    const activeFindings = controls.filter((c) => c.status === 'not-implemented').length;
    const evidenceCoverage = this._calculateEvidenceCoverage(controls, evidence);

    return {
      overallScore: score.overall,
      frameworks: frameworkEntries,
      activeFindings,
      overdueRemediations: controls.filter((c) => {
        if (c.status === 'implemented') return false;
        if (c.nextTestDue == null) return true;
        return new Date(c.nextTestDue).getTime() < Date.now();
      }).length,
      evidenceCoverage,
      lastUpdated: new Date().toISOString(),
      nextAuditDate: this._findNextAudit(events),
      upcomingEvents: events.filter((e) => !e.completed),
      recentDrifts: drifts.slice(0, 10),
    };
  }

  getFrameworkBreakdown(controls: Control[], framework: ComplianceFramework): FrameworkDashboardEntry {
    const fwControls = controls.filter((c) => c.framework === framework);
    const total = fwControls.length;
    const passing = fwControls.filter((c) => c.status === 'implemented').length;
    const failing = fwControls.filter((c) => c.status === 'not-implemented').length;
    const score = total > 0 ? Math.round((passing / total) * 100) : 0;

    return {
      framework,
      score,
      controlCount: total,
      passingCount: passing,
      failingCount: failing,
      evidenceCollected: 0,
      evidenceRequired: total,
      lastAssessment: null,
      nextAudit: null,
      status: this._determineStatus(score),
    };
  }

  calculateTrend(scores: ComplianceScore[]): { direction: 'improving' | 'stable' | 'declining'; delta: number } {
    if (scores.length < 2) return { direction: 'stable', delta: 0 };

    const recent = scores.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const delta = last.overall - first.overall;

    let direction: 'improving' | 'stable' | 'declining';
    if (delta > 5) direction = 'improving';
    else if (delta < -5) direction = 'declining';
    else direction = 'stable';

    return { direction, delta };
  }

  getHighestRiskAreas(controls: Control[]): Array<{ category: string; score: number; failingCount: number }> {
    const categoryMap = new Map<string, Control[]>();

    for (const ctrl of controls) {
      const existing = categoryMap.get(ctrl.category);
      if (existing != null) {
        existing.push(ctrl);
      } else {
        categoryMap.set(ctrl.category, [ctrl]);
      }
    }

    const areas = Array.from(categoryMap.entries()).map(([category, catControls]) => {
      const failingCount = catControls.filter((c) => c.status !== 'implemented').length;
      const score = catControls.length > 0
        ? Math.round(((catControls.length - failingCount) / catControls.length) * 100)
        : 0;
      return { category, score, failingCount };
    });

    return areas.sort((a, b) => a.score - b.score);
  }

  getComplianceTimeline(events: ComplianceEvent[]): Array<{ date: string; title: string; type: string }> {
    const sorted = [...events].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
    return sorted.map((e) => ({
      date: e.dueDate,
      title: e.title,
      type: e.type,
    }));
  }

  getStatusDistribution(controls: Control[]): Record<ControlStatus, number> {
    const distribution: Record<ControlStatus, number> = {
      implemented: 0,
      partial: 0,
      'not-implemented': 0,
      'not-applicable': 0,
    };

    for (const ctrl of controls) {
      distribution[ctrl.status] = (distribution[ctrl.status] ?? 0) + 1;
    }

    return distribution;
  }

  private _buildFrameworkEntries(
    frameworks: ComplianceFramework[],
    controls: Control[],
    evidence: Evidence[],
  ): FrameworkDashboardEntry[] {
    return frameworks.map((fw) => {
      const fwControls = controls.filter((c) => c.framework === fw);
      const total = fwControls.length;
      const passing = fwControls.filter((c) => c.status === 'implemented').length;
      const failing = fwControls.filter((c) => c.status === 'not-implemented').length;
      const score = total > 0 ? Math.round((passing / total) * 100) : 0;

      const controlIds = new Set(fwControls.map((c) => c.id));
      const evidenceForFramework = evidence.filter((e) =>
        e.controlIds.some((cid) => controlIds.has(cid)),
      );

      return {
        framework: fw,
        score,
        controlCount: total,
        passingCount: passing,
        failingCount: failing,
        evidenceCollected: evidenceForFramework.length,
        evidenceRequired: total,
        lastAssessment: null,
        nextAudit: null,
        status: this._determineStatus(score),
      };
    });
  }

  private _calculateEvidenceCoverage(controls: Control[], evidence: Evidence[]): number {
    const controlIds = new Set(controls.map((c) => c.id));
    const coveredIds = new Set<string>();

    for (const ev of evidence) {
      for (const cid of ev.controlIds) {
        if (controlIds.has(cid)) {
          coveredIds.add(cid);
        }
      }
    }

    return controlIds.size > 0 ? Math.round((coveredIds.size / controlIds.size) * 100) : 0;
  }

  private _determineStatus(score: number): FrameworkDashboardEntry['status'] {
    if (score >= 90) return 'compliant';
    if (score >= 70) return 'partial';
    if (score > 0) return 'non_compliant';
    return 'not_assessed';
  }

  private _findNextAudit(events: ComplianceEvent[]): string | null {
    const audits = events
      .filter((e) => e.type === 'audit' && !e.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return audits.length > 0 ? audits[0].dueDate : null;
  }
}
