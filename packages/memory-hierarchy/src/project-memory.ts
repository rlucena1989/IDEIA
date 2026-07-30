import { MemoryEntry, MemoryLevel, EntryCategory, RetentionPolicy } from './types';
import { createLogger } from '@ideia/logger';
import { randomUUID } from 'crypto';

export class ProjectMemory {
  private entries: Map<string, MemoryEntry> = new Map();
  private policy: RetentionPolicy = {
    level: 'project',
    maxEntries: 500,
    defaultTtlMs: 2592000000,
    autoArchiveAfterMs: 7776000000,
    archiveOnAccessThreshold: 3,
    allowedCategories: ['decision', 'pattern', 'architecture', 'error', 'preference', 'event', 'lesson', 'observation'],
  };

  store(content: string, category: EntryCategory, source: string, tags?: string[]): MemoryEntry {
    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      id: randomUUID(),
      level: 'project',
      category,
      content,
      source,
      tags: tags ?? [],
      confidence: 0.85,
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
    entry.accessCount++;
    entry.lastAccessed = new Date().toISOString();
    if (entry.accessCount > this.policy.archiveOnAccessThreshold && entry.status === 'active') {
      entry.status = 'archived';
    }
    return { ...entry };
  }

  search(query: string, category?: EntryCategory): MemoryEntry[] {
    const lower = query.toLowerCase();
    return Array.from(this.entries.values())
      .filter(e => e.status === 'active')
      .filter(e => !category || e.category === category)
      .filter(e => e.content.toLowerCase().includes(lower) || e.tags.some(t => t.toLowerCase().includes(lower)))
      .map(e => ({ ...e }));
  }

  findByTag(tag: string): MemoryEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.status === 'active' && e.tags.includes(tag))
      .map(e => ({ ...e }));
  }

  getAll(): MemoryEntry[] {
    return Array.from(this.entries.values()).map(e => ({ ...e }));
  }

  remove(id: string): void {
    this.entries.delete(id);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
