import { TelemetryEvent } from './telemetry-types';

export class TelemetryCollector {
  private events: TelemetryEvent[] = [];

  record(event: TelemetryEvent): void {
    this.events.push(event);
  }

  list(): TelemetryEvent[] {
    return [...this.events];
  }

  filterBySeverity(severity: TelemetryEvent['severity']): TelemetryEvent[] {
    return this.events.filter(e => e.severity === severity);
  }

  filterByName(name: string): TelemetryEvent[] {
    return this.events.filter(e => e.name === name);
  }

  clear(): void {
    this.events = [];
  }

  count(): number {
    return this.events.length;
  }
}
