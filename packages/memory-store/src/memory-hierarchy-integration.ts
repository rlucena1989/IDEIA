import { MemoryStore, MemoryRecord } from './memory-store';
import { createLogger } from '@ideia/logger';
import { MemoryHierarchy, MemoryCurator, WorkingMemory, ProjectMemory, InstitutionalMemory, GlobalMemory } from '@ideia/memory-hierarchy';
import type { MemoryLevel, EntryCategory, MemoryEntry, HierarchySummary } from '@ideia/memory-hierarchy';
const logger = createLogger('memory-hierarchy-integration');

export class MemoryHierarchyIntegration {
  readonly hierarchy: MemoryHierarchy;
  readonly curator: MemoryCurator;
  readonly working: WorkingMemory;
  readonly project: ProjectMemory;
  readonly institutional: InstitutionalMemory;
  readonly global: GlobalMemory;
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
    this.hierarchy = new MemoryHierarchy();
    this.working = this.hierarchy.working;
    this.project = this.hierarchy.project;
    this.institutional = this.hierarchy.institutional;
    this.global = this.hierarchy.global;
    this.curator = this.hierarchy.curator;
  }

  storeWithLevel(content: string, category: EntryCategory, source: string, level?: MemoryLevel, tags?: string[]): MemoryEntry {
    const entry = this.hierarchy.store(content, category, source, level, tags);

    const record: MemoryRecord = {
      memoryId: entry.id,
      category: this.toMemoryCategory(entry.category),
      source: entry.source,
      summary: entry.content,
      tags: entry.tags,
      createdAt: entry.createdAt,
      severity: 'medium',
    };
    this.store.append(record);

    return entry;
  }

  searchAcrossLevels(query: string, level?: MemoryLevel, category?: EntryCategory): MemoryEntry[] {
    const hierResults = this.hierarchy.search(query, level, category);
    if (hierResults.length === 0) {
      const storeResults = this.store.search(query);
      for (const sr of storeResults) {
        this.working.store(sr.summary, this.toEntryCategory(sr.category), sr.source, sr.tags);
      }
    }
    return hierResults.length > 0 ? hierResults : this.hierarchy.search(query, level, category);
  }

  promoteEntries(): { promoted: MemoryEntry[]; candidates: MemoryEntry[] } {
    return this.curator.evaluatePromotions();
  }

  getSummary(): HierarchySummary[] {
    return this.hierarchy.getSummary();
  }

  syncFromStore(): void {
    const records = this.store.list();
    for (const record of records) {
      const category = this.toEntryCategory(record.category);
      const existing = this.hierarchy.search(record.summary, 'working', category);
      if (existing.length === 0) {
        this.working.store(record.summary, category, record.source, record.tags);
      }
    }
  }

  private toMemoryCategory(cat: EntryCategory): MemoryRecord['category'] {
    const map: Record<string, MemoryRecord['category']> = {
      decision: 'decision',
      pattern: 'pattern',
      architecture: 'pattern',
      error: 'failure',
      preference: 'policy',
      policy: 'policy',
      event: 'change',
      lesson: 'decision',
      observation: 'decision',
    };
    return (map[cat] ?? 'change') as MemoryRecord['category'];
  }

  private toEntryCategory(cat: MemoryRecord['category']): EntryCategory {
    const map: Record<string, EntryCategory> = {
      decision: 'decision',
      pattern: 'pattern',
      architecture: 'architecture',
      error: 'error',
      policy: 'policy',
      change: 'event',
      cycle: 'observation',
      agent: 'lesson',
    };
    return (map[cat] ?? 'observation') as EntryCategory;
  }
}

export function createMemoryHierarchyIntegration(store: MemoryStore): MemoryHierarchyIntegration {
  return new MemoryHierarchyIntegration(store);
}
