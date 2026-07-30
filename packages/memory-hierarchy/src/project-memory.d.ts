import { MemoryEntry, EntryCategory } from './types';
export declare class ProjectMemory {
    private entries;
    private policy;
    store(content: string, category: EntryCategory, source: string, tags?: string[]): MemoryEntry;
    get(id: string): MemoryEntry | undefined;
    search(query: string, category?: EntryCategory): MemoryEntry[];
    findByTag(tag: string): MemoryEntry[];
    getAll(): MemoryEntry[];
    remove(id: string): void;
    clear(): void;
    get size(): number;
}
//# sourceMappingURL=project-memory.d.ts.map