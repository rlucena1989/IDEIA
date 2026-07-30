import { ServiceDefinition, CatalogEntry, ScorecardGrade } from './types';
import { createLogger } from '@ideia/logger';
import { ScorecardManager } from './scorecard-manager';
import { EventEmitter } from 'events';
const logger = createLogger('service-catalog');

export class ServiceCatalog extends EventEmitter {
  private _entries: Map<string, CatalogEntry> = new Map();
  private _scorecardManager: ScorecardManager;

  constructor(scorecardManager: ScorecardManager) {
    super();
    this._scorecardManager = scorecardManager;
  }

  async register(service: ServiceDefinition): Promise<CatalogEntry> {
    const result = await this._scorecardManager.compute(service.name);
    const entry: CatalogEntry = {
      service,
      score: result.score,
      grade: result.grade,
    };
    this._entries.set(service.name, entry);
    this.emit('service-registered', entry);
    return entry;
  }

  unregister(name: string): boolean {
    const removed = this._entries.delete(name);
    if (removed) this.emit('service-unregistered', name);
    return removed;
  }

  get(name: string): CatalogEntry | undefined {
    return this._entries.get(name);
  }

  list(): CatalogEntry[] {
    return Array.from(this._entries.values());
  }

  listByType(type: string): CatalogEntry[] {
    return this.list().filter(e => e.service.type === type);
  }

  listByOwner(owner: string): CatalogEntry[] {
    return this.list().filter(e => e.service.owner === owner);
  }

  listByTag(tag: string): CatalogEntry[] {
    return this.list().filter(e => e.service.tags.includes(tag));
  }

  listByLanguage(lang: string): CatalogEntry[] {
    return this.list().filter(e => e.service.language === lang);
  }

  search(query: string): CatalogEntry[] {
    const lower = query.toLowerCase();
    return this.list().filter(e =>
      e.service.name.toLowerCase().includes(lower) ||
      e.service.owner.toLowerCase().includes(lower) ||
      e.service.tags.some(t => t.toLowerCase().includes(lower)),
    );
  }

  top(n: number): CatalogEntry[] {
    return [...this.list()].sort((a, b) => b.score - a.score).slice(0, n);
  }

  bottom(n: number): CatalogEntry[] {
    return [...this.list()].sort((a, b) => a.score - b.score).slice(0, n);
  }

  groupByOwner(): Map<string, CatalogEntry[]> {
    const groups = new Map<string, CatalogEntry[]>();
    for (const entry of this._entries.values()) {
      const list = groups.get(entry.service.owner) ?? [];
      list.push(entry);
      groups.set(entry.service.owner, list);
    }
    return groups;
  }

  async refreshScore(name: string): Promise<void> {
    const entry = this._entries.get(name);
    if (!entry) return;
    const result = await this._scorecardManager.compute(name);
    entry.score = result.score;
    entry.grade = result.grade;
    this._entries.set(name, entry);
    this.emit('score-refreshed', entry);
  }

  count(): number {
    return this._entries.size;
  }

  clear(): void {
    this._entries.clear();
  }
}
