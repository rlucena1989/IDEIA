import { MemoryRecord, MemoryCategory, MemoryState } from '@ideia/contracts';
import { VectorSearch } from './vector-search';
import type { EventBus } from '@ideia/event-bus';
export { MemoryRecord, MemoryCategory, MemoryState };
export { VectorSearch, createVectorSearch } from './vector-search';
export interface MemorySearchOptions {
    query: string;
    topK?: number;
    minScore?: number;
    category?: MemoryCategory;
    useVectorSearch?: boolean;
}
export declare function createMemoryRecord(params: {
    category: MemoryCategory;
    source: string;
    summary: string;
    tags?: string[];
    severity?: MemoryRecord['severity'];
}): MemoryRecord;
export declare class MemoryStore {
    private filePath?;
    private inMemoryRecords;
    private _loaded;
    private _lockAcquired;
    private _saveTimeout;
    private vectorSearch;
    private _eventBus?;
    private _eventCount;
    private _subscriptionIds;
    constructor(filePath?: string, vectorSearch?: VectorSearch);
    get eventCount(): number;
    setVectorSearch(vs: VectorSearch): void;
    getVectorSearch(): VectorSearch;
    integrateWithEventBus(eventBus: EventBus): Promise<void>;
    disconnectEventBus(): void;
    private eventTypeToCategory;
    private acquireLock;
    private sleep;
    private releaseLock;
    load(): MemoryState;
    private atomicWrite;
    private atomicWriteAsync;
    save(state: MemoryState): void;
    saveAsync(state: MemoryState): Promise<void>;
    private debouncedSave;
    pushDecision(state: MemoryState, decision: Record<string, unknown>): void;
    updateContext(state: MemoryState, ctx: Record<string, unknown>): void;
    private ensureLoaded;
    append(record: MemoryRecord): void;
    private emitMemoryEvent;
    list(): MemoryRecord[];
    findByCategory(category: MemoryCategory): MemoryRecord[];
    findBySeverity(severity: MemoryRecord['severity']): MemoryRecord[];
    search(query: string): MemoryRecord[];
    hybridSearch(options: MemorySearchOptions): {
        results: MemoryRecord[];
        scores: number[];
    };
    count(): number;
    clear(): void;
    destroy(): void;
}
//# sourceMappingURL=memory-store.d.ts.map