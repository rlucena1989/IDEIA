import crypto from 'crypto';
import { createLogger } from '@ideia/logger';
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

function contextSignature(context: string): string {
  return crypto.createHash('md5').update(context).digest('hex');
}

function fuzzyMatch(a: string, b: string): number {
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length < b.length ? a : b;
  if (longer.length === 0) return 1;
  const editDist = levenshtein(longer, shorter);
  return 1 - editDist / longer.length;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0] ?? 0;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j] ?? 0;
      dp[j] = a.charAt(i - 1) === b.charAt(j - 1) ? prev : 1 + Math.min(prev, dp[j] ?? 0, dp[j - 1] ?? 0);
      prev = temp;
    }
  }
  return dp[n] ?? 0;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const FUZZY_THRESHOLD = 0.85;

export class CagCache {
  private cache = new Map<string, CagEntry>();
  private totalHits = 0;
  private totalMisses = 0;
  private semanticHits = 0;
  private semanticMisses = 0;
  private ttl: number;
  private fuzzyThreshold: number;
  private maxSize: number;
  private vectorSearch?: VectorSearch;

  constructor(ttlMs = DEFAULT_TTL_MS, maxSize = 1000, fuzzyThreshold = FUZZY_THRESHOLD, vectorSearch?: VectorSearch) {
    this.ttl = ttlMs;
    this.maxSize = maxSize;
    this.fuzzyThreshold = fuzzyThreshold;
    this.vectorSearch = vectorSearch;
  }

  async semanticGet(query: string, threshold = this.fuzzyThreshold): Promise<{ response: string; confidence: number } | null> {
    this.evictExpired();

    if (this.vectorSearch) {
      const results = await this.vectorSearch.searchAsync(query, 1, {
        minScore: threshold,
        filter: (m) => m.type === 'cag-cache',
      });
      if (results.length > 0) {
        const cacheKey = results[0].record.metadata.cacheKey as string;
        const entry = this.cache.get(cacheKey);
        if (entry && Date.now() < entry.expiresAt) {
          entry.accessCount++;
          this.totalHits++;
          this.semanticHits++;
          return { response: entry.response, confidence: results[0].score };
        }
      }
    }

    let bestMatch: { response: string; confidence: number } | null = null;
    for (const entry of this.cache.values()) {
      if (Date.now() >= entry.expiresAt) continue;
      const matchScore = fuzzyMatch(query, entry.key);
      if (matchScore >= threshold && (!bestMatch || matchScore > bestMatch.confidence)) {
        bestMatch = { response: entry.response, confidence: matchScore };
      }
    }

    if (bestMatch) {
      this.totalHits++;
      this.semanticHits++;
      return bestMatch;
    }

    this.totalMisses++;
    this.semanticMisses++;
    return null;
  }

  get(key: string, context?: string): string | null {
    this.evictExpired();
    const sig = context ? contextSignature(context) : '';

    const exact = this.cache.get(key);
    if (exact && !exact.contextSignature) {
      if (Date.now() < exact.expiresAt) {
        exact.accessCount++;
        this.totalHits++;
        return exact.response;
      }
      this.cache.delete(key);
      this.totalMisses++;
      return null;
    }

    if (exact && exact.contextSignature === sig && Date.now() < exact.expiresAt) {
      exact.accessCount++;
      this.totalHits++;
      return exact.response;
    }

    if (exact && Date.now() >= exact.expiresAt) {
      this.cache.delete(key);
    }

    if (context) {
      for (const entry of this.cache.values()) {
        if (entry.key !== key) continue;
        if (Date.now() >= entry.expiresAt) continue;
        const matchScore = fuzzyMatch(context, entry.context);
        if (matchScore >= this.fuzzyThreshold) {
          entry.accessCount++;
          this.totalHits++;
          return entry.response;
        }
      }
    }

    this.totalMisses++;
    return null;
  }

  set(key: string, response: string, context?: string): void {
    this.evictExpired();
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    const now = Date.now();
    this.cache.set(key, {
      key,
      response,
      contextSignature: context ? contextSignature(context) : '',
      context: context ?? '',
      cachedAt: now,
      expiresAt: now + this.ttl,
      accessCount: 0,
    });
    if (this.vectorSearch) {
      this.vectorSearch.add(`query: ${key} response: ${response}`, { type: 'cag-cache', cacheKey: key });
    }
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
    this.semanticHits = 0;
    this.semanticMisses = 0;
  }

  getStats(): CagStats {
    this.evictExpired();
    let oldest: string | null = null;
    let newest: string | null = null;
    let oldestTime = Infinity;
    let newestTime = 0;

    for (const entry of this.cache.values()) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt;
        oldest = entry.key;
      }
      if (entry.cachedAt > newestTime) {
        newestTime = entry.cachedAt;
        newest = entry.key;
      }
    }

    const total = this.totalHits + this.totalMisses;
    return {
      size: this.cache.size,
      hitRate: total === 0 ? 0 : this.totalHits / total,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      oldestEntry: oldest,
      newestEntry: newest,
      semanticHits: this.semanticHits,
      semanticMisses: this.semanticMisses,
      vectorStoreSize: this.vectorSearch?.size ?? 0,
    };
  }

  setTtl(ttlMs: number): void {
    this.ttl = ttlMs;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let minAccess = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.accessCount < minAccess) {
        minAccess = entry.accessCount;
        lruKey = key;
      }
    }
    if (lruKey) this.cache.delete(lruKey);
  }
}
