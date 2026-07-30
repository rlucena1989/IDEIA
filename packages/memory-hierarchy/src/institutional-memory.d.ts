import { MemoryEntry, EntryCategory } from './types';
export declare class InstitutionalMemory {
    private entries;
    private policy;
    storePolicy(name: string, content: string, tags?: string[]): MemoryEntry;
    storeLesson(content: string, source: string, tags?: string[]): MemoryEntry;
    private store;
    getPolicy(name: string): MemoryEntry | undefined;
    getAllPolicies(): MemoryEntry[];
    search(query: string, category?: EntryCategory): MemoryEntry[];
    getAll(): MemoryEntry[];
    get size(): number;
}
//# sourceMappingURL=institutional-memory.d.ts.map