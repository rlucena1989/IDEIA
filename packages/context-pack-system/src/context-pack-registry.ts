import { ContextPack, RegistryIndex, RegistryIndexEntry, SearchOptions, ListOptions, ResolvedPack, DependencyGraph, DependencyStatus, RegistryValidation, CacheStats } from './types';
import { PackNotFoundError } from './registry-errors';
import { LRUCache } from './registry-cache';
import { DependencyResolver } from './registry-resolver';
import { RegistryStore, InMemoryRegistryStore } from './registry-store';

export { PackNotFoundError, LRUCache, DependencyResolver, RegistryStore, InMemoryRegistryStore };
export type { CacheStats };

export interface RegistryConfig {
  cacheMaxSize: number;
  cacheTTL: number;
}

export class ContextPackRegistry {
  private _packs: Map<string, Map<string, ContextPack>> = new Map();
  private _tagIndex: Map<string, Set<string>> = new Map();
  private _cache: LRUCache<string, ContextPack>;
  private _dependencyResolver: DependencyResolver;

  constructor(private _config: RegistryConfig, private _store: RegistryStore) {
    this._cache = new LRUCache({ maxSize: _config.cacheMaxSize ?? 50, ttl: _config.cacheTTL ?? 300_000 });
    this._dependencyResolver = new DependencyResolver(this);
  }

  get config(): RegistryConfig { return this._config; }
  get store(): RegistryStore { return this._store; }

  async initialize(): Promise<void> {
    const index = await this._store.loadIndex();
    for (const entry of index.packs) {
      const pack = await this._store.loadPack(entry.name, entry.version);
      if (pack) this._registerInternal(pack);
    }
  }

  async register(pack: ContextPack): Promise<void> { this._registerInternal(pack); await this._store.savePack(pack); }

  async unregister(name: string, version?: string): Promise<void> {
    const versions = this._packs.get(name);
    if (!versions) return;
    if (version) {
      const pack = versions.get(version);
      if (pack) { for (const tag of pack.tags) { const s = this._tagIndex.get(tag); if (s) { s.delete(name); if (s.size === 0) this._tagIndex.delete(tag); } } }
      versions.delete(version);
      await this._store.deletePack(name, version);
    } else {
      for (const [, pack] of versions) { for (const tag of pack.tags) { const s = this._tagIndex.get(tag); if (s) { s.delete(name); if (s.size === 0) this._tagIndex.delete(tag); } } }
      this._packs.delete(name);
      for (const ver of Array.from(versions.keys())) await this._store.deletePack(name, ver);
    }
  }

  async update(pack: ContextPack): Promise<void> { await this.unregister(pack.name, pack.version); await this.register(pack); }

  async get(name: string, version?: string): Promise<ContextPack | null> {
    const cacheKey = `${name}@${version ?? 'latest'}`;
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;
    const versions = this._packs.get(name);
    if (!versions) return null;
    let pack: ContextPack | null = null;
    if (version) pack = versions.get(version) ?? null;
    else {
      const sorted = Array.from(versions.keys()).sort((a, b) => { const pa = a.split('.').map(Number); const pb = b.split('.').map(Number); for (let i = 0; i < 3; i++) { const cmp = (pb[i] ?? 0) - (pa[i] ?? 0); if (cmp !== 0) return cmp; } return 0; });
      pack = versions.get(sorted[0]) ?? null;
    }
    if (pack) this._cache.set(cacheKey, pack);
    return pack;
  }

  async resolve(name: string, version?: string): Promise<ResolvedPack> {
    const pack = await this.get(name, version);
    if (!pack) throw new PackNotFoundError(name, version);
    const resolvedChain = await this._dependencyResolver.resolve(pack);
    return { pack, dependencies: resolvedChain.filter(d => d.name !== pack.name), resolvedAt: new Date().toISOString() };
  }

  async resolveMany(names: string[]): Promise<ResolvedPack[]> {
    const results: ResolvedPack[] = []; const visited = new Set<string>();
    for (const name of names) { const [pn, pv] = name.includes('@') ? [name.split('@')[0], name.split('@')[1]] : [name, undefined]; if (!visited.has(pn)) { visited.add(pn); results.push(await this.resolve(pn, pv)); } }
    return results;
  }

  async search(query: string, _options?: SearchOptions): Promise<ContextPack[]> {
    const q = query.toLowerCase(); const results: ContextPack[] = [];
    for (const [, versions] of this._packs) {
      const latest = await this._getLatest(versions);
      if (latest && (latest.name.toLowerCase().includes(q) || latest.description.toLowerCase().includes(q) || latest.tags.some(t => t.toLowerCase().includes(q)) || latest.categories.some(c => c.toLowerCase().includes(q)))) results.push(latest);
    }
    return results;
  }

  async findByTag(tag: string): Promise<ContextPack[]> {
    const names = this._tagIndex.get(tag); if (!names) return [];
    return (await Promise.all(Array.from(names).map(n => this.get(n)))).filter((p): p is ContextPack => p !== null);
  }

  async findByCategory(category: string): Promise<ContextPack[]> {
    const results: ContextPack[] = [];
    for (const [, versions] of this._packs) { const latest = await this._getLatest(versions); if (latest && latest.categories.includes(category)) results.push(latest); }
    return results;
  }

  async list(_options?: ListOptions): Promise<RegistryIndexEntry[]> {
    const entries: RegistryIndexEntry[] = [];
    for (const [, versions] of this._packs) {
      const latest = await this._getLatest(versions);
      if (latest) {
        if (_options?.includeDeprecated === false && latest.deprecated) continue;
        if (_options?.category && !latest.categories.includes(_options.category)) continue;
        if (_options?.tag && !latest.tags.includes(_options.tag)) continue;
        if (_options?.level && latest.level !== _options.level) continue;
        entries.push({ name: latest.name, version: latest.version, tags: latest.tags, totalTokens: latest.totalTokens ?? 0 });
      }
    }
    return entries;
  }

  async resolveDependencies(pack: ContextPack): Promise<DependencyGraph> {
    const deps = await this._dependencyResolver.resolve(pack);
    return { nodes: [pack.name, ...deps.map(d => d.name)], edges: [...pack.dependencies.map(d => ({ from: pack.name, to: d.pack, required: d.required })), ...deps.flatMap(d => d.dependencies.map(sd => ({ from: d.name, to: sd.pack, required: sd.required })))] };
  }

  async checkDependencies(pack: ContextPack): Promise<DependencyStatus[]> {
    return Promise.all(pack.dependencies.map(async dep => {
      const depPack = await this.get(dep.pack, dep.version);
      return { pack: dep.pack, version: dep.version, required: dep.required, resolved: depPack !== null, resolvedVersion: depPack?.version };
    }));
  }

  clearCache(): void { this._cache.clear(); }
  getCacheStats(): CacheStats { return this._cache.getStats(); }

  async validateRegistry(): Promise<RegistryValidation> {
    const errors: string[] = []; let totalPacks = 0; let brokenDependencies = 0;
    for (const [, versions] of this._packs) {
      for (const [, pack] of versions) {
        totalPacks++;
        for (const dep of pack.dependencies) {
          if (dep.required) { const depPack = await this.get(dep.pack, dep.version); if (!depPack) { errors.push(`Required dependency "${dep.pack}@${dep.version}" not found for "${pack.name}"`); brokenDependencies++; } }
        }
      }
    }
    return { valid: errors.length === 0, errors, warnings: [], totalPacks, brokenDependencies };
  }

  async rebuildIndex(): Promise<void> {
    const entries: RegistryIndexEntry[] = [];
    for (const [, versions] of this._packs) { for (const [, pack] of versions) entries.push({ name: pack.name, version: pack.version, tags: pack.tags, totalTokens: pack.totalTokens ?? 0 }); }
    await this._store.saveIndex({ version: 1, updated: new Date().toISOString(), packs: entries });
  }

  private _registerInternal(pack: ContextPack): void {
    if (!this._packs.has(pack.name)) this._packs.set(pack.name, new Map());
    this._packs.get(pack.name)!.set(pack.version, pack);
    for (const tag of pack.tags) { if (!this._tagIndex.has(tag)) this._tagIndex.set(tag, new Set()); this._tagIndex.get(tag)!.add(pack.name); }
  }

  private async _getLatest(versions: Map<string, ContextPack>): Promise<ContextPack | null> {
    const sorted = Array.from(versions.keys()).sort((a, b) => { const pa = a.split('.').map(Number); const pb = b.split('.').map(Number); for (let i = 0; i < 3; i++) { const cmp = (pb[i] ?? 0) - (pa[i] ?? 0); if (cmp !== 0) return cmp; } return 0; });
    return versions.get(sorted[0]) ?? null;
  }
}

