import { createLogger } from '@ideia/logger';
import type { DatabaseAdapter } from './types';

const logger = createLogger('data-layer:catalog');

export interface CatalogEntry {
  id: string;
  name: string;
  type: 'table' | 'file' | 'stream' | 'cache' | 'event' | 'embedding';
  description: string;
  storage: 'sqlite' | 'postgres' | 'memory' | 'nats' | 's3';
  path: string;
  sizeBytes: number;
  rowCount?: number;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionTier: 'ephemeral' | 'operational' | 'analytical' | 'archival';
  owner: string;
  tags: string[];
  dependencies: string[];
  completeness: number;
  accuracy: number;
  validity: number;
  source: string;
  consumers: string[];
  created: string;
  lastUpdated: string;
  lastAccessed: string;
  accessCount: number;
}

export interface CatalogSearchParams {
  q?: string;
  type?: string[];
  classification?: string[];
  tag?: string[];
  owner?: string;
  storage?: string;
  minCompleteness?: number;
  limit?: number;
  offset?: number;
}

export interface CatalogSearchResult {
  entries: CatalogEntry[];
  total: number;
  facets: Record<string, Record<string, number>>;
}

export class DataCatalog {
  private entries: Map<string, CatalogEntry> = new Map();
  private adapter: DatabaseAdapter | null;

  constructor(adapter?: DatabaseAdapter) {
    this.adapter = adapter || null;
  }

  setAdapter(adapter: DatabaseAdapter): void {
    this.adapter = adapter;
  }

  register(entry: Omit<CatalogEntry, 'id' | 'created' | 'lastUpdated' | 'lastAccessed' | 'accessCount'>): string {
    const id = `cat_${crypto.randomUUID().slice(0, 8)}`;
    const full: CatalogEntry = {
      ...entry,
      id,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
    };
    this.entries.set(id, full);
    this.persist(full).catch(e => logger.warn('Catalog persist failed', { error: String(e) }));
    logger.info('Catalog entry registered', { id, name: entry.name, type: entry.type });
    return id;
  }

  getEntry(id: string): CatalogEntry | undefined {
    const entry = this.entries.get(id);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = new Date().toISOString();
    }
    return entry ? { ...entry } : undefined;
  }

  updateStats(id: string, stats: Partial<Pick<CatalogEntry, 'sizeBytes' | 'rowCount' | 'completeness' | 'accuracy' | 'validity'>>): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    Object.assign(entry, stats, { lastUpdated: new Date().toISOString() });
    return true;
  }

  tag(id: string, tags: string[]): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    const tagSet = new Set([...entry.tags, ...tags]);
    entry.tags = Array.from(tagSet);
    entry.lastUpdated = new Date().toISOString();
    return true;
  }

  search(params: CatalogSearchParams): CatalogSearchResult {
    let results = Array.from(this.entries.values());

    if (params.q) {
      const q = params.q.toLowerCase();
      results = results.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (params.type?.length) { const types = params.type; results = results.filter(e => types.includes(e.type)); }
    if (params.classification?.length) { const classifications = params.classification; results = results.filter(e => classifications.includes(e.classification)); }
    if (params.tag?.length) { const tags = params.tag; results = results.filter(e => tags.some(t => e.tags.includes(t))); }
    if (params.owner) results = results.filter(e => e.owner === params.owner);
    if (params.storage) results = results.filter(e => e.storage === params.storage);
    if (params.minCompleteness !== undefined) { const mc = params.minCompleteness; results = results.filter(e => e.completeness >= mc); }

    const total = results.length;

    const facets: Record<string, Record<string, number>> = {
      byType: {},
      byClassification: {},
      byTag: {},
    };
    for (const e of results) {
      facets.byType[e.type] = (facets.byType[e.type] || 0) + 1;
      facets.byClassification[e.classification] = (facets.byClassification[e.classification] || 0) + 1;
      for (const t of e.tags) facets.byTag[t] = (facets.byTag[t] || 0) + 1;
    }

    const offset = params.offset || 0;
    const limit = params.limit || 50;
    results = results.slice(offset, offset + limit);

    return { entries: results, total, facets };
  }

  getLineage(id: string): { sources: string[]; consumers: string[] } {
    const entry = this.entries.get(id);
    if (!entry) return { sources: [], consumers: [] };
    return {
      sources: entry.dependencies.map(d => {
        const dep = this.entries.get(d);
        return dep ? `${dep.name} (${dep.type})` : d;
      }),
      consumers: entry.consumers,
    };
  }

  getUsageStats(): { totalEntries: number; totalSizeBytes: number; byOwner: Record<string, number>; byType: Record<string, number> } {
    const byOwner: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalSizeBytes = 0;

    for (const entry of this.entries.values()) {
      totalSizeBytes += entry.sizeBytes;
      byOwner[entry.owner] = (byOwner[entry.owner] || 0) + 1;
      byType[entry.type] = (byType[entry.type] || 0) + 1;
    }

    return { totalEntries: this.entries.size, totalSizeBytes, byOwner, byType };
  }

  getAll(): CatalogEntry[] {
    return Array.from(this.entries.values());
  }

  private async persist(entry: CatalogEntry): Promise<void> {
    if (!this.adapter) return;
    try {
      await this.adapter.query(
        `INSERT OR REPLACE INTO ideia_catalog (id, name, type, description, storage, path, size_bytes, classification, retention_tier, owner, tags, dependencies, created, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entry.id, entry.name, entry.type, entry.description, entry.storage,
         entry.path, entry.sizeBytes, entry.classification, entry.retentionTier,
         entry.owner, JSON.stringify(entry.tags), JSON.stringify(entry.dependencies),
         entry.created, entry.lastUpdated]
      );
    } catch (e) {
      logger.warn('Catalog persist query failed', { error: String(e) });
    }
  }
}

export function createDataCatalog(adapter?: DatabaseAdapter): DataCatalog {
  return new DataCatalog(adapter);
}
