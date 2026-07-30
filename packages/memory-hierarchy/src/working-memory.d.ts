import { MemoryEntry, EntryCategory } from './types';
export declare class WorkingMemory {
    private entries;
    private policy;
    store(content: string, category: EntryCategory, source: string, tags?: string[]): MemoryEntry;
    get(id: string): MemoryEntry | undefined;
    search(query: string): MemoryEntry[];
    getAll(): MemoryEntry[];
    clear(): void;
    remove(id: string): void;
    get size(): number;
    private isExpired;
    private purgeExpired;
    private evictOldest;
}
//# sourceMappingURL=working-memory.d.ts.map