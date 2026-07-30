import type { ConfigSnapshot, DiffResult } from './types';
export declare class ConfigVersioning {
    private configProvider;
    private snapshots;
    constructor(configProvider: () => Record<string, unknown>);
    initialize(): Promise<void>;
    save(name: string): Promise<string>;
    list(): ConfigSnapshot[];
    diff(v1: string, v2: string): DiffResult;
    rollback(id: string): Promise<void>;
    history(): ConfigSnapshot[];
    loadFromDisk(): Promise<ConfigSnapshot[]>;
    getHistory(): ConfigSnapshot[];
    getVersion(id: string): ConfigSnapshot | undefined;
    describe(id: string): {
        date: string;
        size: number;
        changes: number;
        name: string;
    } | null;
    prune(keep: number): Promise<void>;
    compare(id1: string, id2: string): string;
}
//# sourceMappingURL=config-versioning.d.ts.map