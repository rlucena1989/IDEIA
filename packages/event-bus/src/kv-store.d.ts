import { NatsConnectionManager } from './nats-connection';
export interface KVEntry {
    key: string;
    value: unknown;
    version: number;
    createdAt: number;
    updatedAt: number;
}
export interface KVStoreConfig {
    maxAge?: number;
    maxEntries?: number;
}
export declare class KVStore {
    private connectionManager;
    private config;
    private store;
    private versionCounter;
    constructor(connectionManager: NatsConnectionManager, config?: KVStoreConfig);
    initialize(): Promise<void>;
    put(key: string, value: unknown): Promise<number>;
    get(key: string): Promise<KVEntry | null>;
    delete(key: string): Promise<boolean>;
    update(key: string, value: unknown, expectedVersion?: number): Promise<number>;
    keys(): Promise<string[]>;
    entries(): Promise<KVEntry[]>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    cleanup(): Promise<void>;
    getStats(): Promise<{
        totalEntries: number;
        totalVersions: number;
    }>;
}
export declare function createKVStore(connectionManager: NatsConnectionManager, config?: KVStoreConfig): KVStore;
//# sourceMappingURL=kv-store.d.ts.map