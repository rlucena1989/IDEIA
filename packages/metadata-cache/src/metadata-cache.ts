import type { CacheLayer } from '@ideia/cache';
import { createLogger } from '@ideia/logger';
import type { MetadataEntry, CacheStats } from './types';
const logger = createLogger('metadata-cache');

export class MetadataCache {
  private maxEntries: number;

  constructor(
    private cache: CacheLayer,
    options?: { maxEntries?: number },
  ) {
    this.maxEntries = options?.maxEntries ?? 10000;
  }

  async get(path: string): Promise<MetadataEntry | undefined> {
    return this.cache.get<MetadataEntry>(path);
  }

  async set(path: string, entry: MetadataEntry): Promise<void> {
    const keys = await this.cache.keys();
    if (keys.length >= this.maxEntries) {
      const entries = await Promise.all(
        keys.map(async k => ({ key: k, entry: await this.cache.get<MetadataEntry>(k) }))
      );
      entries.sort((a, b) => (a.entry?.lastModified ?? 0) - (b.entry?.lastModified ?? 0));
      const oldestKey = entries[0]?.key;
      if (oldestKey) await this.cache.delete(oldestKey);
    }
    await this.cache.set(path, entry);
  }

  async delete(path: string): Promise<void> {
    await this.cache.delete(path);
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }

  async stats(): Promise<CacheStats> {
    const keys = await this.cache.keys();
    const entries: MetadataEntry[] = [];
    for (const key of keys) {
      const entry = await this.cache.get<MetadataEntry>(key);
      if (entry) entries.push(entry);
    }

    const allTags = new Set<string>();
    let totalBacklinks = 0;
    for (const e of entries) {
      for (const t of e.tags) allTags.add(t.toLowerCase());
      totalBacklinks += e.backlinks.length;
    }

    return {
      entries: entries.length,
      backlinks: totalBacklinks,
      tags: allTags.size,
      lastIndexed: new Date().toISOString(),
    };
  }

  async search(query: string): Promise<MetadataEntry[]> {
    const q = query.toLowerCase();
    const keys = await this.cache.keys();
    const results: MetadataEntry[] = [];
    for (const key of keys) {
      const entry = await this.cache.get<MetadataEntry>(key);
      if (!entry) continue;
      if (
        entry.path.toLowerCase().includes(q) ||
        (entry.title ?? '').toLowerCase().includes(q) ||
        entry.tags.some(t => t.toLowerCase().includes(q))
      ) {
        results.push(entry);
      }
    }
    return results;
  }

  async getByTag(tag: string): Promise<MetadataEntry[]> {
    const q = tag.toLowerCase();
    const keys = await this.cache.keys();
    const results: MetadataEntry[] = [];
    for (const key of keys) {
      const entry = await this.cache.get<MetadataEntry>(key);
      if (!entry) continue;
      if (entry.tags.some(t => t.toLowerCase() === q)) {
        results.push(entry);
      }
    }
    return results;
  }
}
