import { MemoryEntry, EntryCategory, RetentionPolicy } from './types';
import { createLogger } from '@ideia/logger';
import { randomUUID } from 'crypto';
const logger = createLogger('institutional-memory');

export class InstitutionalMemory {
  private entries: Map<string, MemoryEntry> = new Map();
  private policy: RetentionPolicy = {
    level: 'institutional',
    maxEntries: 200,
    defaultTtlMs: 31536000000,
    autoArchiveAfterMs: 63072000000,
    archiveOnAccessThreshold: 1,
    allowedCategories: ['policy', 'pattern', 'decision', 'lesson'],
  };

  storePolicy(name: string, content: string, tags?: string[]): MemoryEntry {
    return this.store(content, 'policy', `policy:${name}`, tags ?? ['policy']);
  }

  storeLesson(content: string, source: string, tags?: string[]): MemoryEntry {
    return this.store(content, 'lesson', source, tags ?? ['lesson']);
  }

  private store(content: string, category: EntryCategory, source: string, tags: string[]): MemoryEntry {
    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      id: randomUUID(),
      level: 'institutional',
      category,
      content,
      source,
      tags,
      confidence: 0.95,
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

  getPolicy(name: string): MemoryEntry | undefined {
    return Array.from(this.entries.values()).find(e => e.source === `policy:${name}`);
  }

  getAllPolicies(): MemoryEntry[] {
    return this.search('', 'policy');
  }

  search(query: string, category?: EntryCategory): MemoryEntry[] {
    const lower = query.toLowerCase();
    return Array.from(this.entries.values())
      .filter(e => e.status === 'active')
      .filter(e => !category || e.category === category)
      .filter(e => e.content.toLowerCase().includes(lower) || e.tags.some(t => t.toLowerCase().includes(lower)))
      .map(e => ({ ...e }));
  }

  getAll(): MemoryEntry[] {
    return Array.from(this.entries.values()).map(e => ({ ...e }));
  }

  get size(): number {
    return this.entries.size;
  }
}
