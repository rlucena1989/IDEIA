export interface LoRAAdapter {
    id: string;
    name: string;
    baseModel: string;
    method: 'lora' | 'qlora' | 'dora';
    rank: number;
    alpha: number;
    targetModules: string[];
    projectId: string;
    version: number;
    metrics: {
        perplexity?: number;
        trainLoss?: number[];
        evalScore?: number;
    };
    createdAt: string;
    updatedAt: string;
    tags: string[];
    checksum: string;
    active: boolean;
}
export interface AdapterDiff {
    adapterId: string;
    oldVersion: number;
    newVersion: number;
    metricsDelta: {
        perplexity?: number;
        evalScore?: number;
    };
    changedAt: string;
}
export declare class LoRAAdapterStore {
    private adapters;
    private diffs;
    save(adapter: Omit<LoRAAdapter, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'checksum'>): Promise<LoRAAdapter>;
    get(adapterId: string): Promise<LoRAAdapter | undefined>;
    findByProject(projectId: string, activeOnly?: boolean): Promise<LoRAAdapter[]>;
    findByBaseModel(baseModel: string): Promise<LoRAAdapter[]>;
    deactivate(adapterId: string): Promise<void>;
    getDiffHistory(adapterId?: string): Promise<AdapterDiff[]>;
    listAll(): Promise<LoRAAdapter[]>;
    getActiveForProject(projectId: string): Promise<LoRAAdapter | undefined>;
}
//# sourceMappingURL=lora-adapter-store.d.ts.map