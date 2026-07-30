import { randomUUID } from 'crypto';
import { createLogger, Logger } from '@ideia/logger';
import {
  ComplianceFramework,
  AuditReport,
  AuditSection,
  Finding,
  Control,
  ReportFormat,
  FindingSeverity,
  Evidence,
} from './types';

interface AuditReportOptions {
  title?: string;
  periodStart?: string;
  periodEnd?: string;
  generatedBy?: string;
  metadata?: Record<string, unknown>;
}

export class AuditReportGenerator {
  private _logger: Logger;

  constructor() {
    this._logger = createLogger('audit-report-generator');
  }

  generateReport(
    framework: ComplianceFramework,
    controls: Control[],
    evidence: Evidence[],
    options?: AuditReportOptions,
  ): AuditReport {
    const sections = this._buildSections(framework, controls);
    const findings = this._generateFindings(framework, controls);
    const passingCount = controls.filter((c) => c.status === 'implemented').length;
    const failingCount = controls.filter((c) => c.status === 'not-implemented').length;
    const overallScore = controls.length > 0 ? Math.round((passingCount / controls.length) * 100) : 0;

    const report: AuditReport = {
      id: randomUUID(),
      framework,
      title: options?.title ?? `${framework.toUpperCase()} Audit Report`,
      generatedAt: new Date().toISOString(),
      periodStart: options?.periodStart ?? new Date(Date.now() - 90 * 86400000).toISOString(),
      periodEnd: options?.periodEnd ?? new Date().toISOString(),
      overallScore,
      sections,
      findings,
      evidenceCount: evidence.length,
      controlCount: controls.length,
      passingCount,
      failingCount,
      generatedBy: options?.generatedBy ?? 'enterprise-compliance-engine',
      metadata: options?.metadata ?? {},
      remediationPlanId: null,
    };

    this._logger.info('Audit report generated', {
      reportId: report.id,
      framework,
      score: overallScore,
      controls: controls.length,
    });

    return report;
  }

  generateMultiFrameworkReport(
    controlsByFramework: Partial<Record<ComplianceFramework, Control[]>>,
    evidence: Evidence[],
    options?: AuditReportOptions,
  ): AuditReport[] {
    const reports: AuditReport[] = [];

    for (const [framework, fwControls] of Object.entries(controlsByFramework)) {
      if (fwControls == null) continue;
      const report = this.generateReport(framework as ComplianceFramework, fwControls, evidence, {
        ...options,
        title: `${framework.toUpperCase()} Compliance Report`,
      });
      reports.push(report);
    }

    return reports;
  }

  generateExecutiveSummary(reports: AuditReport[]): {
    generatedAt: string;
    totalControls: number;
    totalPassing: number;
    overallScore: number;
    frameworkSummaries: Array<{ framework: ComplianceFramework; score: number; status: string }>;
    criticalFindings: number;
  } {
    const frameworkSummaries = reports.map((r) => ({
      framework: r.framework,
      score: r.overallScore,
      status: this._getScoreStatus(r.overallScore),
    }));

    const totalControls = reports.reduce((sum, r) => sum + r.controlCount, 0);
    const totalPassing = reports.reduce((sum, r) => sum + r.passingCount, 0);
    const overallScore = totalControls > 0 ? Math.round((totalPassing / totalControls) * 100) : 0;
    const criticalFindings = reports.reduce((sum, r) => sum + r.findings.filter((f) => f.severity === 'critical').length, 0);

    return {
      generatedAt: new Date().toISOString(),
      totalControls,
      totalPassing,
      overallScore,
      frameworkSummaries,
      criticalFindings,
    };
  }

  exportReport(report: AuditReport, format: ReportFormat): string {
    const exporters: Record<ReportFormat, (r: AuditReport) => string> = {
      json: this._exportJson.bind(this),
      csv: this._exportCsv.bind(this),
      html: this._exportHtml.bind(this),
      pdf: this._exportPdf.bind(this),
      xlsx: this._exportXlsx.bind(this),
    };

    const exporter = exporters[format];
    if (exporter == null) {
      return this._exportJson(report);
    }
    return exporter(report);
  }

  compareReports(baseline: AuditReport, current: AuditReport): {
    scoreDelta: number;
    newFindings: Finding[];
    resolvedFindings: Finding[];
    unchangedFindings: Finding[];
  } {
    const scoreDelta = current.overallScore - baseline.overallScore;

    const baselineFindingIds = new Set(baseline.findings.map((f) => f.id));
    const currentFindingIds = new Set(current.findings.map((f) => f.id));

    const newFindings = current.findings.filter((f) => !baselineFindingIds.has(f.id));
    const resolvedFindings = baseline.findings.filter((f) => !currentFindingIds.has(f.id));
    const unchangedFindings = current.findings.filter((f) => baselineFindingIds.has(f.id));

    return { scoreDelta, newFindings, resolvedFindings, unchangedFindings };
  }

  private _buildSections(framework: ComplianceFramework, controls: Control[]): AuditSection[] {
    const categoryMap = new Map<string, Control[]>();
    for (const ctrl of controls) {
      const cat = ctrl.category;
      const existing = categoryMap.get(cat);
      if (existing != null) {
        existing.push(ctrl);
      } else {
        categoryMap.set(cat, [ctrl]);
      }
    }

    const sections: AuditSection[] = [];
    for (const [category, catControls] of categoryMap.entries()) {
      const passingCount = catControls.filter((c) => c.status === 'implemented').length;
      const findings = catControls
        .filter((c) => c.status !== 'implemented')
        .map((c) => this._controlToFinding(c));
      const score = catControls.length > 0 ? Math.round((passingCount / catControls.length) * 100) : 0;

      sections.push({
        id: randomUUID(),
        title: `${framework.toUpperCase()} - ${category}`,
        description: `Controls for ${category}`,
        findings,
        framework,
        controlCount: catControls.length,
        passingCount,
        score,
      });
    }

    return sections;
  }

  private _generateFindings(framework: ComplianceFramework, controls: Control[]): Finding[] {
    return controls
      .filter((c) => c.status !== 'implemented')
      .map((c) => this._controlToFinding(c));
  }

  private _controlToFinding(control: Control): Finding {
    return {
      id: randomUUID(),
      controlId: control.controlId,
      requirementId: control.controlId,
      title: `${control.controlId}: ${control.title}`,
      description: control.description,
      severity: this._mapSeverity(control.severity),
      status: 'open',
      framework: control.framework,
      evidenceRefs: [],
      remediationId: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
  }

  private _mapSeverity(severity: Control['severity']): FindingSeverity {
    const map: Record<string, FindingSeverity> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };
    return map[severity] ?? 'medium';
  }

  private _getScoreStatus(score: number): string {
    if (score >= 90) return 'compliant';
    if (score >= 70) return 'partial';
    if (score >= 50) return 'at_risk';
    return 'non_compliant';
  }

  private _exportJson(report: AuditReport): string {
    return JSON.stringify(report, null, 2);
  }

  private _exportCsv(report: AuditReport): string {
    const header = 'Finding ID,Control ID,Title,Severity,Status,Framework,Created At';
    const rows = report.findings.map((f) =>
      `"${f.id}","${f.controlId}","${f.title}","${f.severity}","${f.status}","${f.framework}","${f.createdAt}"`,
    );
    return [header, ...rows].join('\n');
  }

  private _exportHtml(report: AuditReport): string {
    const findingRows = report.findings
      .map((f) =>
        `<tr><td>${f.controlId}</td><td>${f.title}</td><td>${f.severity}</td><td>${f.status}</td></tr>`,
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${report.title}</title></head>
<body>
<h1>${report.title}</h1>
<p>Framework: ${report.framework.toUpperCase()}</p>
<p>Score: ${report.overallScore}/100</p>
<p>Generated: ${report.generatedAt}</p>
<p>Period: ${report.periodStart} to ${report.periodEnd}</p>
<h2>Summary</h2>
<table border="1">
<tr><th>Total Controls</th><td>${report.controlCount}</td></tr>
<tr><th>Passing</th><td>${report.passingCount}</td></tr>
<tr><th>Failing</th><td>${report.failingCount}</td></tr>
<tr><th>Evidence Collected</th><td>${report.evidenceCount}</td></tr>
</table>
<h2>Findings</h2>
<table border="1">
<tr><th>Control</th><th>Title</th><th>Severity</th><th>Status</th></tr>
${findingRows}
</table>
</body>
</html>`;
  }

  private _exportPdf(report: AuditReport): string {
    return this._exportJson(report);
  }

  private _exportXlsx(report: AuditReport): string {
    return this._exportCsv(report);
  }
}
