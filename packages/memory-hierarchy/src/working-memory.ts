import { MemoryEntry, MemoryLevel, EntryCategory, RetentionPolicy } from './types';
import { createLogger } from '@ideia/logger';
import { randomUUID } from 'crypto';

export class WorkingMemory {
  private entries: Map<string, MemoryEntry> = new Map();
  private policy: RetentionPolicy = {
    level: 'working',
    maxEntries: 50,
    defaultTtlMs: 3600000,
    autoArchiveAfterMs: 1800000,
    archiveOnAccessThreshold: 10,
    allowedCategories: ['decision', 'error', 'observation', 'event'],
  };

  store(content: string, category: EntryCategory, source: string, tags?: string[]): MemoryEntry {
    if (!this.policy.allowedCategories.includes(category)) {
      throw new Error(`Category ${category} not allowed in working memory`);
    }

    if (this.entries.size >= this.policy.maxEntries) {
      this.evictOldest();
    }

    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      id: randomUUID(),
      level: 'working',
      category,
      content,
      source,
      tags: tags ?? [],
      confidence: 0.8,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessed: now,
      ttlMs: this.policy.defaultTtlMs,
      status: 'active',
      metadata: {},
    };

    this.entries.set(entry.id, entry);
    return { ...entry };
  }

  get(id: string): MemoryEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.entries.delete(id);
      return undefined;
    }

    entry.accessCount++;
    entry.lastAccessed = new Date().toISOString();
    return { ...entry };
  }

  search(query: string): MemoryEntry[] {
    const lower = query.toLowerCase();
    return Array.from(this.entries.values())
      .filter(e => !this.isExpired(e) && e.status === 'active')
      .filter(e => e.content.toLowerCase().includes(lower) || e.tags.some(t => t.toLowerCase().includes(lower)))
      .map(e => ({ ...e }));
  }

  getAll(): MemoryEntry[] {
    this.purgeExpired();
    return Array.from(this.entries.values())
      .filter(e => e.status === 'active')
      .map(e => ({ ...e }));
  }

  clear(): void {
    this.entries.clear();
  }

  remove(id: string): void {
    this.entries.delete(id);
  }

  get size(): number {
    this.purgeExpired();
    return this.entries.size;
  }

  private isExpired(entry: MemoryEntry): boolean {
    const age = Date.now() - new Date(entry.createdAt).getTime();
    return age > entry.ttlMs;
  }

  private purgeExpired(): void {
    for (const [id, entry] of this.entries) {
      if (this.isExpired(entry)) {
        this.entries.delete(id);
      }
    }
  }

  private evictOldest(): void {
    let oldest: { id: string; lastAccessed: string } | null = null;
    for (const [id, entry] of this.entries) {
      if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
        oldest = { id, lastAccessed: entry.lastAccessed };
      }
    }
    if (oldest) this.entries.delete(oldest.id);
  }
}
