import { MemoryEntry, EntryCategory, MemoryLevel, HierarchySummary } from './types';
import { createLogger } from '@ideia/logger';
import { WorkingMemory } from './working-memory';
import { ProjectMemory } from './project-memory';
import { InstitutionalMemory } from './institutional-memory';
import { GlobalMemory } from './global-memory';
import { MemoryCurator } from './curator';
const logger = createLogger('hierarchy');

export class MemoryHierarchy {
  readonly working: WorkingMemory;
  readonly project: ProjectMemory;
  readonly institutional: InstitutionalMemory;
  readonly global: GlobalMemory;
  readonly curator: MemoryCurator;

  constructor() {
    this.working = new WorkingMemory();
    this.project = new ProjectMemory();
    this.institutional = new InstitutionalMemory();
    this.global = new GlobalMemory();
    this.curator = new MemoryCurator(this.working, this.project, this.institutional, this.global);
  }

  store(content: string, category: EntryCategory, source: string, level?: MemoryLevel, tags?: string[]): MemoryEntry {
    const targetLevel = level ?? this.inferLevel(category);
    switch (targetLevel) {
      case 'working':
        return this.working.store(content, category, source, tags);
      case 'project':
        return this.project.store(content, category, source, tags);
      case 'institutional':
        return this.institutional.storePolicy(source, content, tags);
      case 'global':
        return this.global.storePattern(source, content, tags);
    }
  }

  search(query: string, level?: MemoryLevel, category?: EntryCategory): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    const levels = level ? [level] : ['working' as MemoryLevel, 'project' as MemoryLevel, 'institutional' as MemoryLevel, 'global' as MemoryLevel];

    for (const l of levels) {
      const entries = this.searchLevel(l, query, category);
      results.push(...entries);
    }

    return results;
  }

  private searchLevel(level: MemoryLevel, query: string, category?: EntryCategory): MemoryEntry[] {
    switch (level) {
      case 'working': return this.working.search(query);
      case 'project': return this.project.search(query, category);
      case 'institutional': return this.institutional.search(query, category);
      case 'global': return this.global.search(query, category);
    }
  }

  getSummary(): HierarchySummary[] {
    return [
      this.buildSummary('working', this.working),
      this.buildSummary('project', this.project),
      this.buildSummary('institutional', this.institutional),
      this.buildSummary('global', this.global),
    ];
  }

  get(id: string, level?: MemoryLevel): MemoryEntry | undefined {
    if (!level || level === 'working') {
      const entry = this.working.get(id);
      if (entry) return entry;
    }
    if (!level || level === 'project') {
      const entry = this.project.get(id);
      if (entry) return entry;
    }
    if (!level || level === 'institutional') {
      const entry = this.institutional.getPolicy(id);
      if (entry) return entry;
    }
    if (!level || level === 'global') {
      const entry = this.global.findByTag(id)[0];
      if (entry) return entry;
    }
    return undefined;
  }

  private inferLevel(category: EntryCategory): MemoryLevel {
    if (['error', 'observation', 'event'].includes(category)) return 'working';
    if (['decision', 'preference', 'architecture'].includes(category)) return 'project';
    if (['policy'].includes(category)) return 'institutional';
    return 'project';
  }

  private buildSummary(level: MemoryLevel, store: { getAll: () => MemoryEntry[]; size: number }): HierarchySummary {
    const entries = store.getAll();
    const _now = Date.now();
    let oldest: string | null = null;
    let newest: string | null = null;

    for (const e of entries) {
      if (!oldest || e.createdAt < oldest) oldest = e.createdAt;
      if (!newest || e.createdAt > newest) newest = e.createdAt;
    }

    return {
      level,
      totalEntries: store.size,
      activeEntries: entries.filter(e => e.status === 'active').length,
      archivedEntries: entries.filter(e => e.status === 'archived').length,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }
}
