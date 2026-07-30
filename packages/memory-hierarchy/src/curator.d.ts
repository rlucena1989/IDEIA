import { MemoryEntry, MemoryLevel, PromotionRule } from './types';
import { WorkingMemory } from './working-memory';
import { ProjectMemory } from './project-memory';
import { InstitutionalMemory } from './institutional-memory';
import { GlobalMemory } from './global-memory';
export interface CuratorConfig {
    autoPromote: boolean;
    promotionRules: PromotionRule[];
}
export declare class MemoryCurator {
    private working;
    private project;
    private institutional;
    private global;
    private config;
    constructor(working: WorkingMemory, project: ProjectMemory, institutional: InstitutionalMemory, global: GlobalMemory, config?: Partial<CuratorConfig>);
    evaluatePromotions(): {
        promoted: MemoryEntry[];
        candidates: MemoryEntry[];
    };
    promote(entry: MemoryEntry, toLevel: MemoryLevel): MemoryEntry;
    getSummary(): {
        working: number;
        project: number;
        institutional: number;
        global: number;
        promoted: number;
    };
}
//# sourceMappingURL=curator.d.ts.map