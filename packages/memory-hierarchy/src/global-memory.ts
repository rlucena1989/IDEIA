import { MemoryEntry, EntryCategory } from './types';
import { createLogger } from '@ideia/logger';
import { randomUUID } from 'crypto';
const logger = createLogger('global-memory');

export class GlobalMemory {
  private entries: Map<string, MemoryEntry> = new Map();

  storeBestPractice(topic: string, content: string, tags?: string[]): MemoryEntry {
    return this.store(content, 'pattern', `best-practice:${topic}`, tags ?? ['best-practice', topic]);
  }

  storePattern(name: string, content: string, tags?: string[]): MemoryEntry {
    return this.store(content, 'pattern', `pattern:${name}`, tags ?? ['pattern', name]);
  }

  private store(content: string, category: EntryCategory, source: string, tags: string[]): MemoryEntry {
    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      id: randomUUID(),
      level: 'global',
      category,
      content,
      source,
      tags,
      confidence: 0.9,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessed: now,
      ttlMs: 31536000000,
      status: 'active',
      metadata: {},
    };
    this.entries.set(entry.id, entry);
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

  get size(): number {
    return this.entries.size;
  }
}
