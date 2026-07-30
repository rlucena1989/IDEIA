import { MetricEvent, DORAMetrics, AggregatedReport, Period } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('devx-metrics-collector');

export class DevXMetricsCollector {
  private _events: MetricEvent[] = [];
  private _maxEvents: number;

  constructor(maxEvents = 50000) {
    this._maxEvents = maxEvents;
  }

  async record(event: MetricEvent): Promise<void> {
    this._events.push(event);
    if (this._events.length > this._maxEvents) {
      this._events = this._events.slice(-this._maxEvents);
    }
  }

  async recordBatch(events: MetricEvent[]): Promise<void> {
    for (const e of events) {
      await this.record(e);
    }
  }

  getEvents(type?: string, since?: Date): MetricEvent[] {
    let filtered = this._events;
    if (type) filtered = filtered.filter(e => e.type === type);
    if (since) filtered = filtered.filter(e => e.timestamp >= since);
    return filtered;
  }

  countByType(type: string, since?: Date): number {
    return this.getEvents(type, since).length;
  }

  clear(): void {
    this._events = [];
  }
}
