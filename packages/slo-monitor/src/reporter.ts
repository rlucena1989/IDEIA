import { SloMonitor } from './slo-monitor';
import { SloViolation, SloResult } from './types';
import { createLogger } from '@ideia/logger';

const log = createLogger('slo:reporter');

export interface WeeklyReport {
  reportId: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  totalContracts: number;
  statusCounts: Record<string, number>;
  overallAvailability: number;
  violationsCount: number;
  violations: SloViolation[];
  contracts: SloResult[];
  topViolations: Array<{ contract: string; metric: string; count: number }>;
  summary: string;
}

export class SloReporter {
  private monitor: SloMonitor;
  private reportHistory: WeeklyReport[] = [];

  constructor(monitor: SloMonitor) {
    this.monitor = monitor;
  }

  generateWeeklyReport(): WeeklyReport {
    const dashboard = this.monitor.getDashboard();
    const violations = this.monitor.getViolations();

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentViolations = violations.filter(v => v.timestamp >= weekAgo);

    const metricCounts = new Map<string, number>();
    for (const v of recentViolations) {
      const key = `${v.contract}:${v.metric}`;
      metricCounts.set(key, (metricCounts.get(key) ?? 0) + 1);
    }

    const topViolations = Array.from(metricCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [contract, metric] = key.split(':');
        return { contract: contract ?? '', metric: metric ?? '', count };
      });

    const periodStart = new Date(weekAgo).toISOString();
    const periodEnd = new Date(now).toISOString();

    const statusCounts: Record<string, number> = {
      healthy: dashboard.healthy,
      warning: dashboard.warning,
      degraded: dashboard.degraded,
      violated: dashboard.violated,
      unknown: dashboard.unknown,
    };

    const healthyCount = dashboard.healthy;
    const totalCount = dashboard.totalContracts;
    const healthPercent = totalCount > 0 ? (healthyCount / totalCount) * 100 : 0;

    let summary: string;
    if (healthPercent >= 95) {
      summary = `Excellent week: ${healthPercent.toFixed(1)}% of contracts healthy. ${recentViolations.length} violations.`;
    } else if (healthPercent >= 80) {
      summary = `Good week: ${healthPercent.toFixed(1)}% healthy. ${recentViolations.length} violations need attention.`;
    } else if (healthPercent >= 60) {
      summary = `Fair week: ${healthPercent.toFixed(1)}% healthy. ${recentViolations.length} violations - review required.`;
    } else {
      summary = `Poor week: ${healthPercent.toFixed(1)}% healthy. ${recentViolations.length} violations - immediate action needed.`;
    }

    const report: WeeklyReport = {
      reportId: `slo-report-${now}`,
      generatedAt: new Date().toISOString(),
      periodStart,
      periodEnd,
      totalContracts: dashboard.totalContracts,
      statusCounts,
      overallAvailability: dashboard.overallAvailability,
      violationsCount: recentViolations.length,
      violations: recentViolations,
      contracts: dashboard.contracts,
      topViolations,
      summary,
    };

    this.reportHistory.push(report);
    if (this.reportHistory.length > 52) this.reportHistory.shift();
    log.info('Weekly SLO report generated', { reportId: report.reportId, healthPercent });
    return report;
  }

  formatText(report: WeeklyReport): string {
    const lines: string[] = [
      `SLO Weekly Report - ${report.periodStart.slice(0, 10)} to ${report.periodEnd.slice(0, 10)}`,
      `Report ID: ${report.reportId}`,
      `Generated: ${report.generatedAt}`,
      '',
      `Summary: ${report.summary}`,
      '',
      `Contracts: ${report.totalContracts}`,
      `  Healthy:    ${report.statusCounts.healthy}`,
      `  Warning:    ${report.statusCounts.warning}`,
      `  Degraded:   ${report.statusCounts.degraded}`,
      `  Violated:   ${report.statusCounts.violated}`,
      `  Unknown:    ${report.statusCounts.unknown}`,
      `Overall Availability: ${report.overallAvailability.toFixed(2)}%`,
      `Total Violations: ${report.violationsCount}`,
    ];

    if (report.topViolations.length > 0) {
      lines.push('', 'Top Violations:');
      for (const tv of report.topViolations) {
        lines.push(`  ${tv.contract} - ${tv.metric}: ${tv.count} occurrences`);
      }
    }

    return lines.join('\n');
  }

  toJson(report: WeeklyReport): string {
    return JSON.stringify(report, null, 2);
  }

  getReportHistory(): WeeklyReport[] {
    return [...this.reportHistory];
  }
}

export function createSloReporter(monitor: SloMonitor): SloReporter {
  return new SloReporter(monitor);
}
