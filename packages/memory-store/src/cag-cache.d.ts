import { VectorSearch } from './vector-search';
export interface CagEntry {
    key: string;
    response: string;
    contextSignature: string;
    context: string;
    cachedAt: number;
    expiresAt: number;
    accessCount: number;
}
export interface CagStats {
    size: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    oldestEntry: string | null;
    newestEntry: string | null;
    semanticHits: number;
    semanticMisses: number;
    vectorStoreSize: number;
}
export declare class CagCache {
    private cache;
    private totalHits;
    private totalMisses;
    private semanticHits;
    private semanticMisses;
    private ttl;
    private fuzzyThreshold;
    private maxSize;
    private vectorSearch?;
    constructor(ttlMs?: number, maxSize?: number, fuzzyThreshold?: number, vectorSearch?: VectorSearch);
    semanticGet(query: string, threshold?: number): Promise<{
        response: string;
        confidence: number;
    } | null>;
    get(key: string, context?: string): string | null;
    set(key: string, response: string, context?: string): void;
    invalidate(key: string): boolean;
    clear(): void;
    getStats(): CagStats;
    setTtl(ttlMs: number): void;
    private evictExpired;
    private evictLRU;
}
//# sourceMappingURL=cag-cache.d.ts.map