import { Telemetry } from './telemetry';
import { createLogger } from '@ideia/logger';
import { MetricsStore } from './metrics-store';
const logger = createLogger('observability');

export class Observability {
  constructor(
    private telemetry: Telemetry,
    private metrics: MetricsStore
  ) {}

  trackCycleStart(mode: string) {
    this.telemetry.emit('cycle.start', { mode });
    this.metrics.record('cycle.start', 1, { mode });
  }

  trackCycleEnd(mode: string, success: boolean, durationMs: number, quality: number) {
    this.telemetry.emit('cycle.end', { mode, success, durationMs, quality });
    this.metrics.record('cycle.end', success ? 1 : 0, { mode });
    this.metrics.record('cycle.duration_ms', durationMs, { mode });
    this.metrics.record('cycle.quality', quality, { mode });
  }

  trackAlert(level: string, message: string) {
    this.telemetry.emit('alert', { level, message });
    this.metrics.record('alert.count', 1, { level });
  }

  trackDecision(data: { mode: string; shouldPause: boolean; reason: string }) {
    this.telemetry.emit('decision', data);
    this.metrics.record('decision.count', 1, { mode: data.mode });
  }
}
