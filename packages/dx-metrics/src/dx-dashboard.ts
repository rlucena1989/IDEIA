import { DORAMetrics, DORATargets } from './dora-metrics';
import { createLogger } from '@ideia/logger';
import { SPACEScore } from './space-framework';
import { DXReport } from './dx-reporter';
const logger = createLogger('dx-dashboard');

export interface DashboardPanel {
  title: string;
  metric: string;
  value: number;
  target: number;
  status: 'elite' | 'high' | 'medium' | 'low';
  trend: 'improving' | 'declining' | 'stable';
  sparkline: number[];
}

export interface DXDashboard {
  dora: {
    deployFrequency: DashboardPanel;
    leadTime: DashboardPanel;
    mttr: DashboardPanel;
    changeFailureRate: DashboardPanel;
  };
  space: {
    satisfaction: DashboardPanel;
    performance: DashboardPanel;
    activity: DashboardPanel;
    communication: DashboardPanel;
    efficiency: DashboardPanel;
  };
  overall: {
    score: number;
    trend: string;
    alerts: string[];
    lastUpdated: string;
  };
}

export class DxDashboardBuilder {
  buildFromReport(report: DXReport, targets: DORATargets): DXDashboard {
    const doraPanels = this._buildDoraPanels(report.dora, targets);
    const spacePanels = this._buildSpacePanels(report.space);

    const panels = [
      doraPanels.deployFrequency,
      doraPanels.leadTime,
      doraPanels.mttr,
      doraPanels.changeFailureRate,
      spacePanels.satisfaction,
      spacePanels.performance,
      spacePanels.activity,
      spacePanels.communication,
      spacePanels.efficiency,
    ];

    const overallScore = Math.round(panels.reduce((sum, p) => {
      const weight = p.status === 'elite' ? 1 : p.status === 'high' ? 0.8 : p.status === 'medium' ? 0.5 : 0.2;
      return sum + (p.value / Math.max(p.target, 1)) * 100 * weight;
    }, 0) / panels.length);

    const improvingCount = panels.filter(p => p.trend === 'improving').length;
    const decliningCount = panels.filter(p => p.trend === 'declining').length;
    const trend = improvingCount > decliningCount ? 'improving' : decliningCount > improvingCount ? 'declining' : 'stable';

    return {
      dora: doraPanels,
      space: spacePanels,
      overall: {
        score: Math.min(100, overallScore),
        trend,
        alerts: report.alerts,
        lastUpdated: report.generatedAt,
      },
    };
  }

  private _buildDoraPanels(metrics: DORAMetrics, targets: DORATargets): DXDashboard['dora'] {
    return {
      deployFrequency: {
        title: 'Deploy Frequency',
        metric: 'deploy-frequency',
        value: metrics.deployFrequency,
        target: targets.deployFrequency,
        status: this._determineStatus(metrics.deployFrequency, targets.deployFrequency, true),
        trend: 'stable',
        sparkline: [metrics.deployFrequency],
      },
      leadTime: {
        title: 'Lead Time',
        metric: 'lead-time',
        value: metrics.leadTime,
        target: targets.leadTime,
        status: this._determineStatus(metrics.leadTime, targets.leadTime, false),
        trend: 'stable',
        sparkline: [metrics.leadTime],
      },
      mttr: {
        title: 'MTTR',
        metric: 'mttr',
        value: metrics.mttr,
        target: targets.mttr,
        status: this._determineStatus(metrics.mttr, targets.mttr, false),
        trend: 'stable',
        sparkline: [metrics.mttr],
      },
      changeFailureRate: {
        title: 'Change Failure Rate',
        metric: 'change-failure-rate',
        value: metrics.changeFailureRate,
        target: targets.changeFailureRate,
        status: this._determineStatus(metrics.changeFailureRate, targets.changeFailureRate, false),
        trend: 'stable',
        sparkline: [metrics.changeFailureRate],
      },
    };
  }

  private _buildSpacePanels(space: SPACEScore): DXDashboard['space'] {
    return {
      satisfaction: {
        title: 'Satisfaction',
        metric: 'satisfaction',
        value: space.satisfaction,
        target: 85,
        status: this._determineStatus(space.satisfaction, 85, true),
        trend: 'stable',
        sparkline: [space.satisfaction],
      },
      performance: {
        title: 'Performance',
        metric: 'performance',
        value: space.performance,
        target: 85,
        status: this._determineStatus(space.performance, 85, true),
        trend: 'stable',
        sparkline: [space.performance],
      },
      activity: {
        title: 'Activity',
        metric: 'activity',
        value: space.activity,
        target: 80,
        status: this._determineStatus(space.activity, 80, true),
        trend: 'stable',
        sparkline: [space.activity],
      },
      communication: {
        title: 'Communication',
        metric: 'communication',
        value: space.communication,
        target: 85,
        status: this._determineStatus(space.communication, 85, true),
        trend: 'stable',
        sparkline: [space.communication],
      },
      efficiency: {
        title: 'Efficiency',
        metric: 'efficiency',
        value: space.efficiency,
        target: 85,
        status: this._determineStatus(space.efficiency, 85, true),
        trend: 'stable',
        sparkline: [space.efficiency],
      },
    };
  }

  private _determineStatus(actual: number, target: number, higherIsBetter: boolean): 'elite' | 'high' | 'medium' | 'low' {
    const ratio = higherIsBetter
      ? actual / Math.max(target, 0.001)
      : Math.max(target, 0.001) / Math.max(actual, 0.001);
    if (ratio >= 2) return 'elite';
    if (ratio >= 1) return 'high';
    if (ratio >= 0.5) return 'medium';
    return 'low';
  }
}
