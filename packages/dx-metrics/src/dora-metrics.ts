export interface DeployEvent {
  timestamp: string;
  duration: number;
  success: boolean;
  recoveryDuration?: number;
}

export interface DORAMetrics {
  deployFrequency: number;
  leadTime: number;
  mttr: number;
  changeFailureRate: number;
  timestamp: string;
}

export interface DORATargets {
  deployFrequency: number;
  leadTime: number;
  mttr: number;
  changeFailureRate: number;
}

export class DORACalculator {
  calculate(events: DeployEvent[]): DORAMetrics {
    if (events.length === 0) {
      return {
        deployFrequency: 0,
        leadTime: 0,
        mttr: 0,
        changeFailureRate: 0,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      deployFrequency: this.calculateDeployFrequency(events),
      leadTime: this.calculateLeadTime(events),
      mttr: this.calculateMTTR(events),
      changeFailureRate: this.calculateChangeFailureRate(events),
      timestamp: new Date().toISOString(),
    };
  }

  compare(
    metrics: DORAMetrics,
    targets: DORATargets,
  ): { metric: string; status: 'elite' | 'high' | 'medium' | 'low'; actual: number; target: number }[] {
    return [
      this.compareMetric('deploy-frequency', metrics.deployFrequency, targets.deployFrequency, true),
      this.compareMetric('lead-time', metrics.leadTime, targets.leadTime, false),
      this.compareMetric('mttr', metrics.mttr, targets.mttr, false),
      this.compareMetric('change-failure-rate', metrics.changeFailureRate, targets.changeFailureRate, false),
    ];
  }

  getEliteTargets(): DORATargets {
    return {
      deployFrequency: 10,
      leadTime: 1,
      mttr: 1,
      changeFailureRate: 5,
    };
  }

  private calculateDeployFrequency(events: DeployEvent[]): number {
    const days = new Set(events.map(e => e.timestamp.slice(0, 10)));
    return days.size === 0 ? 0 : Math.round((events.length / days.size) * 100) / 100;
  }

  private calculateLeadTime(events: DeployEvent[]): number {
    const leadTimes = events.map(e => e.duration);
    return Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 100) / 100;
  }

  private calculateMTTR(events: DeployEvent[]): number {
    const failedEvents = events.filter(e => !e.success && e.recoveryDuration != null);
    if (failedEvents.length === 0) return 0;
    return Math.round((failedEvents.reduce((a, e) => a + (e.recoveryDuration ?? 0), 0) / failedEvents.length) * 100) / 100;
  }

  private calculateChangeFailureRate(events: DeployEvent[]): number {
    const failures = events.filter(e => !e.success).length;
    return Math.round((failures / events.length) * 100 * 100) / 100;
  }

  private compareMetric(
    metric: string,
    actual: number,
    target: number,
    higherIsBetter: boolean,
  ): { metric: string; status: 'elite' | 'high' | 'medium' | 'low'; actual: number; target: number } {
    const ratio = higherIsBetter
      ? actual / Math.max(target, 0.001)
      : Math.max(target, 0.001) / Math.max(actual, 0.001);
    let status: 'elite' | 'high' | 'medium' | 'low';
    if (ratio >= 2) status = 'elite';
    else if (ratio >= 1) status = 'high';
    else if (ratio >= 0.5) status = 'medium';
    else status = 'low';

    return { metric, status, actual, target };
  }
}
