import { CacheHit, LLMCacheConfig } from '../types';
export declare class LLMCache {
    private store;
    private config;
    constructor(config?: Partial<LLMCacheConfig>);
    get<T>(key: string): CacheHit<T>;
    set<T>(key: string, value: T, ttlMs?: number): void;
    invalidate(key: string): void;
    invalidateByPrefix(prefix: string): void;
    clear(): void;
    size(): number;
    getStats(): {
        entries: number;
        maxEntries: number;
        oldest: string | null;
        newest: string | null;
    };
    makeKey(prefix: string, ...parts: string[]): string;
    private evictLRU;
}
//# sourceMappingURL=llm-cache.d.ts.map