import { DevExMetricCollector } from './collector';
import { createLogger } from '@ideia/logger';
import { DORACalculator, DORAMetrics, DORATargets, DeployEvent } from './dora-metrics';
import { SPACECalculator, SPACEScore } from './space-framework';
const logger = createLogger('dx-reporter');

export interface DXReport {
  dora: DORAMetrics;
  space: SPACEScore;
  trends: { metric: string; direction: 'improving' | 'declining' | 'stable'; change: number }[];
  alerts: string[];
  generatedAt: string;
}

export class DXReporter {
  private collector: DevExMetricCollector;
  private doraCalculator: DORACalculator;
  private spaceCalculator: SPACECalculator;

  constructor(
    collector: DevExMetricCollector,
    doraCalculator?: DORACalculator,
    spaceCalculator?: SPACECalculator,
  ) {
    this.collector = collector;
    this.doraCalculator = doraCalculator ?? new DORACalculator();
    this.spaceCalculator = spaceCalculator ?? new SPACECalculator();
  }

  async generateReport(events: DeployEvent[], targets?: DORATargets): Promise<DXReport> {
    const dora = this.doraCalculator.calculate(events);
    const space = await this.spaceCalculator.calculate();
    const effectiveTargets = targets ?? this.doraCalculator.getEliteTargets();
    const alerts = this.detectAlerts(dora, effectiveTargets);

    return {
      dora,
      space,
      trends: [],
      alerts,
      generatedAt: new Date().toISOString(),
    };
  }

  generateSummary(report: DXReport): string {
    return (
      `DORA: ${report.dora.deployFrequency} deploys/day, ${report.dora.leadTime.toFixed(1)}h lead time, ` +
      `${report.dora.changeFailureRate.toFixed(1)}% CFR, ${report.dora.mttr.toFixed(1)}h MTTR | ` +
      `SPACE: ${report.space.overall}/100 | Alerts: ${report.alerts.length}`
    );
  }

  getTrends(
    history: DXReport[],
  ): { metric: string; direction: 'improving' | 'declining' | 'stable'; change: number }[] {
    if (history.length < 2) return [];
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    return [
      {
        metric: 'deploy-frequency',
        direction: this.calcDirection(latest.dora.deployFrequency, previous.dora.deployFrequency, true),
        change: Math.round((latest.dora.deployFrequency - previous.dora.deployFrequency) * 100) / 100,
      },
      {
        metric: 'lead-time',
        direction: this.calcDirection(previous.dora.leadTime, latest.dora.leadTime, false),
        change: Math.round((latest.dora.leadTime - previous.dora.leadTime) * 100) / 100,
      },
      {
        metric: 'mttr',
        direction: this.calcDirection(previous.dora.mttr, latest.dora.mttr, false),
        change: Math.round((latest.dora.mttr - previous.dora.mttr) * 100) / 100,
      },
      {
        metric: 'space-overall',
        direction: this.calcDirection(latest.space.overall, previous.space.overall, true),
        change: latest.space.overall - previous.space.overall,
      },
    ];
  }

  private detectAlerts(metrics: DORAMetrics, targets: DORATargets): string[] {
    const alerts: string[] = [];
    if (metrics.deployFrequency < targets.deployFrequency * 0.5) {
      alerts.push(
        `Low deploy frequency: ${metrics.deployFrequency.toFixed(1)}/day (target: ${targets.deployFrequency})`,
      );
    }
    if (metrics.leadTime > targets.leadTime * 2) {
      alerts.push(`High lead time: ${metrics.leadTime.toFixed(1)}h (target: ${targets.leadTime}h)`);
    }
    if (metrics.mttr > targets.mttr * 2) {
      alerts.push(`High MTTR: ${metrics.mttr.toFixed(1)}h (target: ${targets.mttr}h)`);
    }
    if (metrics.changeFailureRate > targets.changeFailureRate * 2) {
      alerts.push(
        `High change failure rate: ${metrics.changeFailureRate.toFixed(1)}% (target: ${targets.changeFailureRate}%)`,
      );
    }
    return alerts;
  }

  private calcDirection(
    current: number,
    previous: number,
    higherIsBetter: boolean,
  ): 'improving' | 'declining' | 'stable' {
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return 'stable';
    if (higherIsBetter) return diff > 0 ? 'improving' : 'declining';
    return diff < 0 ? 'improving' : 'declining';
  }
}
