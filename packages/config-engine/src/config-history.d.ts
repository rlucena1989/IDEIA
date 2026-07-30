export interface ConfigVersion {
    id: number;
    timestamp: string;
    config: Record<string, unknown>;
    label?: string;
    checksum: string;
}
export interface ConfigVersion {
    id: number;
    timestamp: string;
    config: Record<string, unknown>;
    label?: string;
    checksum: string;
}
export declare class ConfigHistory {
    private versions;
    private historyDir;
    constructor(historyDir?: string);
    snapshot(config: Record<string, unknown>, label?: string): ConfigVersion;
    get(id: number): ConfigVersion | undefined;
    getLatest(): ConfigVersion | undefined;
    getAll(): ConfigVersion[];
    diff(idA: number, idB: number): Array<{
        key: string;
        from: unknown;
        to: unknown;
    }>;
    rollback(id: number): Record<string, unknown> | null;
    search(query: string): ConfigVersion[];
    getLatestVersion(): ConfigVersion | null;
    getVersionCount(): number;
    private nextId;
    private checksum;
    private load;
    private persist;
}
export declare function createConfigHistory(historyDir?: string): ConfigHistory;
//# sourceMappingURL=config-history.d.ts.map