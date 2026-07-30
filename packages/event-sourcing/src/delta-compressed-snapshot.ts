import { DeltaResult, DeltaEntry } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('delta-compressed-snapshot');

export class DeltaCompressedSnapshot {
  private _lastSnapshot = new Map<string, Record<string, unknown>>();

  async saveWithDelta(aggregateId: string, currentState: Record<string, unknown>, version: number): Promise<DeltaResult> {
    const previous = this._lastSnapshot.get(aggregateId) || {};
    const delta = this._computeDelta(previous, currentState);

    this._lastSnapshot.set(aggregateId, { ...currentState });

    const fullSize = new TextEncoder().encode(JSON.stringify(currentState)).length;
    const deltaSize = new TextEncoder().encode(JSON.stringify(delta)).length;

    return {
      aggregateId,
      version,
      deltaSize,
      fullSize,
      compressionRatio: deltaSize > 0 ? fullSize / deltaSize : 1,
      delta,
      timestamp: Date.now(),
    };
  }

  reconstruct(aggregateId: string, deltas: DeltaEntry[]): Record<string, unknown> {
    let state: Record<string, unknown> = {};
    for (const d of deltas) {
      state = this._applyDelta(state, d);
    }
    return state;
  }

  private _computeDelta(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, unknown> {
    const delta: Record<string, unknown> = {};
    for (const key of Object.keys(after)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        delta[key] = after[key];
      }
    }
    for (const key of Object.keys(before)) {
      if (!(key in after)) delta[key] = null;
    }
    return delta;
  }

  private _applyDelta(state: Record<string, unknown>, delta: DeltaEntry): Record<string, unknown> {
    const updated = { ...state };
    for (const [key, value] of Object.entries(delta.changes)) {
      if (value === null) delete updated[key];
      else updated[key] = value;
    }
    return updated;
  }

  clearCache(): void {
    this._lastSnapshot.clear();
  }
}
