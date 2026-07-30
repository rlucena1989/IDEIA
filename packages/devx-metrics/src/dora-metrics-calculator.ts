import { DORAMetrics, MetricEvent, Period, DORAHistory } from './types';
import { createLogger } from '@ideia/logger';
import { DevXMetricsCollector } from './devx-metrics-collector';
const logger = createLogger('dora-metrics-calculator');

export class DORAMetricsCalculator {
  private _collector: DevXMetricsCollector;

  constructor(collector: DevXMetricsCollector) {
    this._collector = collector;
  }

  async calculate(period: Period = '24h'): Promise<DORAMetrics> {
    const since = this._computeSince(period);
    const [deployFrequency, leadTime, mttr, changeFailureRate] = await Promise.all([
      this._calculateDeployFrequency(since),
      this._calculateLeadTime(since),
      this._calculateMTTR(since),
      this._calculateChangeFailureRate(since),
    ]);
    return {
      deployFrequency,
      leadTime,
      mttr,
      changeFailureRate,
      period,
      timestamp: new Date(),
    };
  }

  async getHistory(days: number): Promise<DORAHistory[]> {
    const history: DORAHistory[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dayEvents = this._collector.getEvents(undefined, dayStart)
        .filter(e => e.timestamp < dayEnd);
      const deploys = dayEvents.filter(e => e.type === 'deploy');
      const prMerges = dayEvents.filter(e => e.type === 'pr_merge');
      const incidents = dayEvents.filter(e => e.type === 'incident');
      const failedDeploys = deploys.filter(e => e.status === 'failure');
      history.push({
        date: dayStart.toISOString().slice(0, 10),
        deployFrequency: deploys.length,
        leadTime: prMerges.length > 0 ? prMerges.reduce((s, e) => s + e.duration, 0) / prMerges.length : 0,
        mttr: incidents.length > 0 ? incidents.reduce((s, e) => s + e.duration, 0) / incidents.length : 0,
        changeFailureRate: deploys.length > 0 ? failedDeploys.length / deploys.length : 0,
      });
    }
    return history;
  }

  async getLeadTimeChange(): Promise<number> {
    const current = await this._calculateLeadTime(this._computeSince('24h'));
    const previous = await this._calculateLeadTime(this._computeSince('48h', '24h'));
    return previous > 0 ? ((current - previous) / previous) : 0;
  }

  async getMTTRChange(): Promise<number> {
    const current = await this._calculateMTTR(this._computeSince('24h'));
    const previous = await this._calculateMTTR(this._computeSince('48h', '24h'));
    return previous > 0 ? ((current - previous) / previous) : 0;
  }

  async analyzeDeploymentVelocity(): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }> {
    const daily = await this._calculateDeployFrequency(this._computeSince('24h'));
    const weekly = await this._calculateDeployFrequency(this._computeSince('7d'));
    const monthly = await this._calculateDeployFrequency(this._computeSince('30d'));
    const trend = weekly > monthly * 1.1 ? 'increasing' : weekly < monthly * 0.9 ? 'decreasing' : 'stable';
    return { daily, weekly: weekly / 7, monthly: monthly / 30, trend };
  }

  private async _calculateDeployFrequency(since: Date): Promise<number> {
    const deploys = this._collector.getEvents('deploy', since);
    const days = Math.max(1, (Date.now() - since.getTime()) / 86400000);
    return deploys.length / days;
  }

  private async _calculateLeadTime(since: Date): Promise<number> {
    const prMerges = this._collector.getEvents('pr_merge', since);
    if (prMerges.length === 0) return 0;
    return prMerges.reduce((s, e) => s + e.duration, 0) / prMerges.length;
  }

  private async _calculateMTTR(since: Date): Promise<number> {
    const incidents = this._collector.getEvents('incident', since);
    if (incidents.length === 0) return 0;
    return incidents.reduce((s, e) => s + e.duration, 0) / incidents.length;
  }

  private async _calculateChangeFailureRate(since: Date): Promise<number> {
    const deploys = this._collector.getEvents('deploy', since);
    if (deploys.length === 0) return 0;
    const failed = deploys.filter(e => e.status === 'failure');
    return failed.length / deploys.length;
  }

  private _computeSince(period: Period | '48h', offset?: Period | '24h'): Date {
    const now = new Date();
    const offsetMs = offset ? this._periodToMs(offset as Period) : 0;
    return new Date(now.getTime() - this._periodToMs(period as Period) - offsetMs);
  }

  private _periodToMs(period: Period): number {
    switch (period) {
      case '24h': return 86400000;
      case '7d': return 7 * 86400000;
      case '30d': return 30 * 86400000;
      case 'sprint': return 14 * 86400000;
    }
  }
}
