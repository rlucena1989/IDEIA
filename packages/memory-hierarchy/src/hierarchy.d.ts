import { MemoryEntry, EntryCategory, MemoryLevel, HierarchySummary } from './types';
import { WorkingMemory } from './working-memory';
import { ProjectMemory } from './project-memory';
import { InstitutionalMemory } from './institutional-memory';
import { GlobalMemory } from './global-memory';
import { MemoryCurator } from './curator';
export declare class MemoryHierarchy {
    readonly working: WorkingMemory;
    readonly project: ProjectMemory;
    readonly institutional: InstitutionalMemory;
    readonly global: GlobalMemory;
    readonly curator: MemoryCurator;
    constructor();
    store(content: string, category: EntryCategory, source: string, level?: MemoryLevel, tags?: string[]): MemoryEntry;
    search(query: string, level?: MemoryLevel, category?: EntryCategory): MemoryEntry[];
    private searchLevel;
    getSummary(): HierarchySummary[];
    get(id: string, level?: MemoryLevel): MemoryEntry | undefined;
    private inferLevel;
    private buildSummary;
}
//# sourceMappingURL=hierarchy.d.ts.map