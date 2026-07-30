import { ContextPack } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('context-pack-loader');

export interface PackLoaderConfig {
  basePath?: string;
  cacheEnabled?: boolean;
  maxCacheSize?: number;
}

export abstract class PackLoader {
  abstract load(name: string, version?: string): Promise<ContextPack | null>;
  abstract loadMany(names: string[]): Promise<ContextPack[]>;
  abstract exists(name: string, version?: string): Promise<boolean>;
  abstract listAvailable(): Promise<string[]>;
}

export class FilePackLoader extends PackLoader {
  private _cache: Map<string, ContextPack> = new Map();

  constructor(private _config: PackLoaderConfig = {}) {
    super();
  }

  async load(name: string, _version?: string): Promise<ContextPack | null> {
    const key = `${name}@${_version ?? 'latest'}`;
    const cached = this._cache.get(key);
    if (cached && this._config.cacheEnabled !== false) return cached;

    const pack = await this._loadFromFs(name, _version);
    if (pack && this._config.cacheEnabled !== false) {
      if (this._cache.size >= (this._config.maxCacheSize ?? 100)) {
        const firstKey = this._cache.keys().next().value;
        if (firstKey !== undefined) this._cache.delete(firstKey);
      }
      this._cache.set(key, pack);
    }
    return pack;
  }

  async loadMany(names: string[]): Promise<ContextPack[]> {
    const results: ContextPack[] = [];
    for (const name of names) {
      const [packName, packVersion] = name.includes('@')
        ? [name.split('@')[0], name.split('@')[1]]
        : [name, undefined];
      const pack = await this.load(packName, packVersion);
      if (pack) results.push(pack);
    }
    return results;
  }

  async exists(name: string, _version?: string): Promise<boolean> {
    const pack = await this.load(name, _version);
    return pack !== null;
  }

  async listAvailable(): Promise<string[]> {
    return Array.from(this._cache.keys());
  }

  private async _loadFromFs(_name: string, _version?: string): Promise<ContextPack | null> {
    return null;
  }

  clearCache(): void {
    this._cache.clear();
  }
}

export class MemoryPackLoader extends PackLoader {
  private _packs = new Map<string, ContextPack>();

  addPack(pack: ContextPack): void {
    const key = `${pack.name}@${pack.version}`;
    this._packs.set(key, pack);
  }

  removePack(name: string, version: string): void {
    const key = `${name}@${version}`;
    this._packs.delete(key);
  }

  async load(name: string, _version?: string): Promise<ContextPack | null> {
    const key = `${name}@${_version ?? 'latest'}`;
    if (_version) {
      return this._packs.get(key) ?? null;
    }
    const candidates = Array.from(this._packs.entries())
      .filter(([k]) => k.startsWith(`${name}@`))
      .sort(([a], [b]) => b.localeCompare(a));
    return candidates.length > 0 ? candidates[0][1] : null;
  }

  async loadMany(names: string[]): Promise<ContextPack[]> {
    const results: ContextPack[] = [];
    for (const name of names) {
      const pack = await this.load(name);
      if (pack) results.push(pack);
    }
    return results;
  }

  async exists(name: string, _version?: string): Promise<boolean> {
    const pack = await this.load(name, _version);
    return pack !== null;
  }

  async listAvailable(): Promise<string[]> {
    return Array.from(this._packs.keys());
  }
}
