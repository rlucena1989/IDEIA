import { NatsConnectionManager } from './nats-connection';
export interface ObjectMetadata {
    name: string;
    size: number;
    contentType?: string;
    uploadedAt: number;
    version: number;
}
export interface StoredObject {
    metadata: ObjectMetadata;
    data: Buffer;
}
export interface ObjectStoreConfig {
    maxAge?: number;
    maxObjects?: number;
    maxSizeBytes?: number;
}
export declare class ObjectStore {
    private connectionManager;
    private config;
    private store;
    private versionCounter;
    private totalSizeBytes;
    constructor(connectionManager: NatsConnectionManager, config?: ObjectStoreConfig);
    initialize(config?: Partial<ObjectStoreConfig>): Promise<void>;
    put(name: string, data: Buffer, contentType?: string): Promise<ObjectMetadata>;
    get(name: string): Promise<StoredObject | null>;
    getMetadata(name: string): Promise<ObjectMetadata | null>;
    delete(name: string): Promise<boolean>;
    list(): Promise<ObjectMetadata[]>;
    has(name: string): Promise<boolean>;
    clear(): Promise<void>;
    cleanup(): Promise<void>;
    getStats(): Promise<{
        totalObjects: number;
        totalSizeBytes: number;
        totalVersions: number;
    }>;
}
export declare function createObjectStore(connectionManager: NatsConnectionManager, config?: ObjectStoreConfig): ObjectStore;
//# sourceMappingURL=object-store.d.ts.map