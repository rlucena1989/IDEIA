import { SnapshotStore, SnapshotData, SnapshotStrategy } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('snapshot-store');

export class SnapshotStoreManager implements SnapshotStore {
  private _store = new Map<string, SnapshotData>();

  async save(aggregateId: string, snapshot: SnapshotData): Promise<void> {
    this._store.set(aggregateId, { ...snapshot, timestamp: Date.now() });
  }

  async load(aggregateId: string): Promise<SnapshotData | null> {
    return this._store.get(aggregateId) ?? null;
  }

  async delete(aggregateId: string): Promise<void> {
    this._store.delete(aggregateId);
  }

  async *list(prefix = ''): AsyncGenerator<string> {
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) yield key;
    }
  }
}

export class FixedIntervalStrategy implements SnapshotStrategy {
  constructor(private _interval = 50) {}

  shouldSnapshot(aggregate: { version: number }): boolean {
    return aggregate.version > 0 && aggregate.version % this._interval === 0;
  }
}

interface SnapshotTier {
  upToVersion: number;
  interval: number;
}

export class AdaptiveThresholdStrategy implements SnapshotStrategy {
  constructor(
    private _tiers: SnapshotTier[] = [
      { upToVersion: 50, interval: 10 },
      { upToVersion: 500, interval: 50 },
      { upToVersion: Infinity, interval: 100 },
    ]
  ) {}

  shouldSnapshot(aggregate: { version: number }): boolean {
    if (aggregate.version <= 0) return false;
    const tier = this._tiers.find(t => aggregate.version <= t.upToVersion);
    return aggregate.version % (tier?.interval ?? 100) === 0;
  }
}

export class OnDemandStrategy implements SnapshotStrategy {
  shouldSnapshot(_aggregate: { id?: string; version: number }): boolean {
    return false;
  }
}

export class SizeBasedStrategy implements SnapshotStrategy {
  private _lastSnapshotVersion = new Map<string, number>();

  constructor(private _threshold = 100) {}

  shouldSnapshot(aggregate: { id?: string; version: number }): boolean {
    if (!aggregate.id) return false;
    const last = this._lastSnapshotVersion.get(aggregate.id) ?? 0;
    if (aggregate.version - last >= this._threshold) {
      this._lastSnapshotVersion.set(aggregate.id, aggregate.version);
      return true;
    }
    return false;
  }
}

export class HybridSnapshotStrategy implements SnapshotStrategy {
  private _strategies: SnapshotStrategy[];

  constructor(...strategies: SnapshotStrategy[]) {
    this._strategies = strategies;
  }

  shouldSnapshot(aggregate: { id?: string; version: number }): boolean {
    return this._strategies.some(s => s.shouldSnapshot(aggregate));
  }
}

export class SnapshotRewriter {
  constructor(
    private _snapshotStore: SnapshotStore
  ) {}

  async rewriteAll(upcastFn: (state: Record<string, unknown>, targetVersion: number) => Record<string, unknown>, targetVersion: number): Promise<number> {
    let rewritten = 0;
    for await (const key of this._snapshotStore.list()) {
      const snapshot = await this._snapshotStore.load(key);
      if (!snapshot) continue;
      const upcasted = upcastFn(snapshot.state, targetVersion);
      await this._snapshotStore.save(key, { state: upcasted, version: targetVersion, timestamp: Date.now() });
      rewritten++;
    }
    return rewritten;
  }
}
