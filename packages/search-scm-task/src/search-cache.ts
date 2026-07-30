import { SearchOptions, SearchResult } from './types';
import { createLogger } from '@ideia/logger';
import { createHash } from 'crypto';
const logger = createLogger('search-cache');

interface InvertedIndexEntry {
  term: string;
  fileCount: number;
  files: Map<string, number>;
}

interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
  hitCount: number;
}

interface HitStats {
  hits: number;
  misses: number;
}

export class SearchCache {
  private invertedIndex = new Map<string, InvertedIndexEntry>();
  private resultCache = new Map<string, CacheEntry>();
  private maxCacheSize: number;
  private maxIndexTerms: number;
  private ttlMs: number;
  private hitStats: HitStats = { hits: 0, misses: 0 };
  private termFrequency = new Map<string, number>();

  constructor(maxCacheSize = 500, maxIndexTerms = 10000, ttlMs = 300000) {
    this.maxCacheSize = maxCacheSize;
    this.maxIndexTerms = maxIndexTerms;
    this.ttlMs = ttlMs;
  }

  private cacheKey(query: string, options?: SearchOptions): string {
    const hash = createHash('sha256');
    hash.update(query);
    if (options) {
      hash.update(JSON.stringify({
        include: options.include?.sort(),
        exclude: options.exclude?.sort(),
        maxResults: options.maxResults,
        matchCase: options.matchCase,
        isRegex: options.isRegex,
        matchWholeWord: options.matchWholeWord,
      }));
    }
    return hash.digest('hex');
  }

  get(query: string, options?: SearchOptions): SearchResult[] | undefined {
    const key = this.cacheKey(query, options);
    const entry = this.resultCache.get(key);
    if (!entry) {
      this.hitStats.misses++;
      return undefined;
    }
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.resultCache.delete(key);
      this.hitStats.misses++;
      return undefined;
    }
    entry.hitCount++;
    this.hitStats.hits++;
    this.termFrequency.set(query, (this.termFrequency.get(query) ?? 0) + 1);
    // O(1) LRU touch: delete + set to move to end
    this.resultCache.delete(key);
    this.resultCache.set(key, entry);
    return entry.results;
  }

  set(query: string, results: SearchResult[], options?: SearchOptions): void {
    const key = this.cacheKey(query, options);
    this.resultCache.set(key, {
      results,
      timestamp: Date.now(),
      hitCount: 0,
    });
    this.indexResults(query, results);
    this.evict();
  }

  invalidate(filePattern?: string): void {
    if (!filePattern) {
      this.resultCache.clear();
      return;
    }
    for (const [key, entry] of this.resultCache) {
      const hasMatch = entry.results.some(r => r.uri.includes(filePattern));
      if (hasMatch) {
        this.resultCache.delete(key);
      }
    }
  }

  invalidateForProvider(providerName: string): void {
    for (const [key, entry] of this.resultCache) {
      const hasMatch = entry.results.some(
        r => r.uri.startsWith(`${providerName}://`) || r.uri.includes(providerName)
      );
      if (hasMatch) {
        this.resultCache.delete(key);
      }
    }
  }

  getHitRate(): number {
    const total = this.hitStats.hits + this.hitStats.misses;
    return total > 0 ? this.hitStats.hits / total : 0;
  }

  getTopTerms(limit: number): Array<{ term: string; count: number }> {
    return Array.from(this.termFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([term, count]) => ({ term, count }));
  }

  getStats(): { entries: number; indexTerms: number; hitRate: number } {
    let totalHits = 0;
    let totalEntries = 0;
    for (const entry of this.resultCache.values()) {
      totalHits += entry.hitCount;
      totalEntries++;
    }
    return {
      entries: this.resultCache.size,
      indexTerms: this.invertedIndex.size,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
    };
  }

  async preload(terms: string[], fetchFn: (query: string) => Promise<SearchResult[]>, options?: SearchOptions): Promise<void> {
    const promises = terms.map(async (term) => {
      const key = this.cacheKey(term, options);
      if (this.resultCache.has(key)) return;
      try {
        const results = await fetchFn(term);
        this.set(term, results, options);
      } catch {
        // Silently ignore preload failures
      }
    });
    await Promise.all(promises);
  }

  private indexResults(query: string, results: SearchResult[]): void {
    const terms = this.tokenize(query);
    for (const term of terms) {
      let entry = this.invertedIndex.get(term);
      if (!entry) {
        if (this.invertedIndex.size >= this.maxIndexTerms) return;
        entry = { term, fileCount: 0, files: new Map() };
        this.invertedIndex.set(term, entry);
      }
      const uniqueFiles = new Set(results.map(r => r.uri));
      for (const file of uniqueFiles) {
        entry.files.set(file, (entry.files.get(file) ?? 0) + 1);
      }
      entry.fileCount = entry.files.size;
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^\w]+/)
      .filter(t => t.length > 1);
  }

  private evict(): void {
    if (this.resultCache.size <= this.maxCacheSize) return;
    const toDelete = this.resultCache.size - this.maxCacheSize;
    const iter = this.resultCache.keys();
    for (let i = 0; i < toDelete; i++) {
      const next = iter.next();
      if (next.done) break;
      this.resultCache.delete(next.value);
    }
  }
}
