import type { CacheLayer, CacheOptions, CacheStats } from './cache-layer';
export declare class NatsKvCache implements CacheLayer {
    private kv;
    private hits;
    private misses;
    private evictions;
    private localCache;
    constructor(_options?: CacheOptions);
    connect(_url?: string): Promise<void>;
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<boolean>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    stats(): Promise<CacheStats>;
    keys(): Promise<string[]>;
}
//# sourceMappingURL=nats-kv-cache.d.ts.map