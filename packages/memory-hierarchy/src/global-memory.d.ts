import { MemoryEntry, EntryCategory } from './types';
export declare class GlobalMemory {
    private entries;
    storeBestPractice(topic: string, content: string, tags?: string[]): MemoryEntry;
    storePattern(name: string, content: string, tags?: string[]): MemoryEntry;
    private store;
    search(query: string, category?: EntryCategory): MemoryEntry[];
    findByTag(tag: string): MemoryEntry[];
    getAll(): MemoryEntry[];
    get size(): number;
}
//# sourceMappingURL=global-memory.d.ts.map