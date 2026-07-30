import type { Snapshot } from './types-event-sourcing';
import { createLogger } from '@ideia/logger';
const logger = createLogger('snapshot-store');

export class InMemorySnapshotStore {
  private snapshots: Map<string, Snapshot> = new Map();

  private key(aggregateType: string, aggregateId: string): string {
    return `${aggregateType}.${aggregateId}`;
  }

  saveSnapshot<TState>(
    aggregateType: string,
    aggregateId: string,
    state: TState,
    version: number,
  ): void {
    const snapshot: Snapshot<TState> = {
      aggregateType,
      aggregateId,
      state,
      version,
      timestamp: Date.now(),
    };
    this.snapshots.set(this.key(aggregateType, aggregateId), snapshot as Snapshot);
  }

  loadSnapshot<TState>(
    aggregateType: string,
    aggregateId: string,
  ): Snapshot<TState> | undefined {
    const k = this.key(aggregateType, aggregateId);
    const snapshot = this.snapshots.get(k);
    if (snapshot === undefined) {
      return undefined;
    }
    return snapshot as Snapshot<TState>;
  }

  listSnapshots<TState>(aggregateType: string): Snapshot<TState>[] {
    const prefix = `${aggregateType}.`;
    const result: Snapshot<TState>[] = [];
    for (const [k, snapshot] of this.snapshots) {
      if (k.startsWith(prefix)) {
        result.push(snapshot as Snapshot<TState>);
      }
    }
    return result.sort((a, b) => b.version - a.version);
  }

  deleteSnapshot(aggregateType: string, aggregateId: string): boolean {
    const k = this.key(aggregateType, aggregateId);
    return this.snapshots.delete(k);
  }
}
