import { ConsistencyReport } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('consistency-verifier');

export class ConsistencyVerifier {
  private _vectorClocks: Map<string, Map<string, number>> = new Map();
  private _thresholds: Map<string, { maxLagMs: number; maxEvents: number }> = new Map();

  registerProjection(name: string, maxLagMs: number = 1000, maxEvents: number = 10): void {
    this._thresholds.set(name, { maxLagMs, maxEvents });
    this._vectorClocks.set(name, new Map());
  }

  async verifyConsistency(
    projection: string,
    events: Array<{ type: string; aggregateId: string; version: number; timestamp: number }>,
  ): Promise<ConsistencyReport> {
    const clock = this._vectorClocks.get(projection) ?? new Map();
    const threshold = this._thresholds.get(projection) ?? { maxLagMs: 1000, maxEvents: 10 };

    let maxEventTimestamp = 0;
    let missingEvents = 0;
    const gaps: Array<{ aggregateId: string; expectedVersion: number; gap: number }> = [];

    for (const event of events) {
      maxEventTimestamp = Math.max(maxEventTimestamp, event.timestamp);
      const lastVersion = clock.get(event.aggregateId) ?? 0;
      if (event.version > lastVersion + 1) {
        const gap = event.version - lastVersion - 1;
        missingEvents += gap;
        gaps.push({ aggregateId: event.aggregateId, expectedVersion: lastVersion + 1, gap });
      }
    }

    const now = Date.now();
    const lagMs = now - maxEventTimestamp;
    const isConsistent = missingEvents === 0 && lagMs <= threshold.maxLagMs;

    return {
      isConsistent,
      projection,
      lagMs,
      missingEvents,
      maxEventTimestamp,
      gaps: gaps.slice(0, 5),
      eventsToCatchUp: missingEvents,
      estimatedCatchUpMs: missingEvents * 5,
      status: isConsistent ? 'consistent' : lagMs > threshold.maxLagMs ? 'lagging' : 'inconsistent',
    };
  }

  async updateClock(projection: string, aggregateId: string, version: number): Promise<void> {
    if (!this._vectorClocks.has(projection)) {
      this._vectorClocks.set(projection, new Map());
    }
    this._vectorClocks.get(projection)!.set(aggregateId, version);
  }

  getProjectionLag(projection: string, events: Array<{ timestamp: number }>): { lagMs: number; pendingEvents: number } {
    const maxTimestamp = events.reduce((max, e) => Math.max(max, e.timestamp), 0);
    return { lagMs: Date.now() - maxTimestamp, pendingEvents: 0 };
  }
}