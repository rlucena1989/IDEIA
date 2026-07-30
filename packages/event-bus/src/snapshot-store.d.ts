import type { Snapshot } from './types-event-sourcing';
export declare class InMemorySnapshotStore {
    private snapshots;
    private key;
    saveSnapshot<TState>(aggregateType: string, aggregateId: string, state: TState, version: number): void;
    loadSnapshot<TState>(aggregateType: string, aggregateId: string): Snapshot<TState> | undefined;
    listSnapshots<TState>(aggregateType: string): Snapshot<TState>[];
    deleteSnapshot(aggregateType: string, aggregateId: string): boolean;
}
//# sourceMappingURL=snapshot-store.d.ts.map