import { DORAMetrics } from './dora-metrics';
import { createLogger } from '@ideia/logger';
const logger = createLogger('ci-dora-collector');

export interface CIEvent {
  type: 'deploy' | 'failure' | 'rollback' | 'recovery';
  timestamp: string;
  duration?: number;
  environment?: string;
}

export class CIDoraCollector {
  private _events: CIEvent[] = [];
  private maxEvents = 50000;

  processEvent(event: CIEvent): void {
    this._events.push(event);
    if (this._events.length > this.maxEvents) {
      this._events = this._events.slice(-this.maxEvents);
    }
  }

  getMetrics(): DORAMetrics {
    return {
      deployFrequency: this._calculateDeployFrequency(),
      leadTime: this._calculateLeadTime(),
      mttr: this._calculateMTTR(),
      changeFailureRate: this._calculateChangeFailureRate(),
      timestamp: new Date().toISOString(),
    };
  }

  getDailyMetrics(date: string): DORAMetrics {
    const dayEvents = this._events.filter(e => e.timestamp.slice(0, 10) === date);
    if (dayEvents.length === 0) {
      return {
        deployFrequency: 0,
        leadTime: 0,
        mttr: 0,
        changeFailureRate: 0,
        timestamp: new Date().toISOString(),
      };
    }
    return this._computeMetrics(dayEvents);
  }

  getWeeklyTrend(): DORAMetrics[] {
    const trend: DORAMetrics[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      trend.push(this.getDailyMetrics(dateStr));
    }
    return trend;
  }

  private _calculateDeployFrequency(): number {
    if (this._events.length === 0) return 0;
    const days = new Set(this._events.map(e => e.timestamp.slice(0, 10)));
    return days.size === 0 ? 0 : Math.round((this._events.length / days.size) * 100) / 100;
  }

  private _calculateLeadTime(): number {
    const deploys = this._events.filter(e => e.type === 'deploy' && e.duration != null);
    if (deploys.length === 0) return 0;
    const total = deploys.reduce((sum, e) => sum + (e.duration ?? 0), 0);
    return Math.round((total / deploys.length) * 100) / 100;
  }

  private _calculateMTTR(): number {
    const recoveries = this._events.filter(e => e.type === 'recovery' && e.duration != null);
    if (recoveries.length === 0) return 0;
    const total = recoveries.reduce((sum, e) => sum + (e.duration ?? 0), 0);
    return Math.round((total / recoveries.length) * 100) / 100;
  }

  private _calculateChangeFailureRate(): number {
    const totalDeploys = this._events.filter(e => e.type === 'deploy').length;
    const failures = this._events.filter(e => e.type === 'failure').length;
    if (totalDeploys === 0) return 0;
    return Math.round((failures / totalDeploys) * 100 * 100) / 100;
  }

  private _computeMetrics(events: CIEvent[]): DORAMetrics {
    const deploys = events.filter(e => e.type === 'deploy');
    const failures = events.filter(e => e.type === 'failure');
    const recoveries = events.filter(e => e.type === 'recovery' && e.duration != null);
    const days = new Set(events.map(e => e.timestamp.slice(0, 10)));

    const deployFrequency = days.size === 0 ? 0 : Math.round((deploys.length / days.size) * 100) / 100;
    const leadTime = deploys.length === 0 ? 0 : Math.round((deploys.reduce((s, e) => s + (e.duration ?? 0), 0) / deploys.length) * 100) / 100;
    const mttr = recoveries.length === 0 ? 0 : Math.round((recoveries.reduce((s, e) => s + (e.duration ?? 0), 0) / recoveries.length) * 100) / 100;
    const changeFailureRate = deploys.length === 0 ? 0 : Math.round((failures.length / deploys.length) * 100 * 100) / 100;

    return {
      deployFrequency,
      leadTime,
      mttr,
      changeFailureRate,
      timestamp: new Date().toISOString(),
    };
  }
}
