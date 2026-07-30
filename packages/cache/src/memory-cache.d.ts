import type { CacheLayer, CacheOptions, CacheStats } from './cache-layer';
export declare class MemoryCache implements CacheLayer {
    private store;
    private hits;
    private misses;
    private evictions;
    private maxSize;
    private defaultTtlMs;
    constructor(options?: CacheOptions);
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<boolean>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    stats(): Promise<CacheStats>;
    keys(): Promise<string[]>;
}
//# sourceMappingURL=memory-cache.d.ts.map