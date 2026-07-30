import { ContextPack, RegistryIndex } from './types';

export interface RegistryStore {
  get(id: string): ContextPack | undefined;
  set(id: string, pack: ContextPack): void;
  delete(id: string): boolean;
  list(): ContextPack[];
  clear(): void;
  loadIndex(): Promise<RegistryIndex>;
  loadPack(name: string, version: string): Promise<ContextPack | null>;
  savePack(pack: ContextPack): Promise<void>;
  deletePack(name: string, version: string): Promise<void>;
  saveIndex(index: RegistryIndex): Promise<void>;
}

export class InMemoryRegistryStore implements RegistryStore {
  private _packs = new Map<string, ContextPack>();

  get(id: string): ContextPack | undefined { return this._packs.get(id); }
  set(id: string, pack: ContextPack): void { this._packs.set(id, pack); }
  delete(id: string): boolean { return this._packs.delete(id); }
  list(): ContextPack[] { return Array.from(this._packs.values()); }
  clear(): void { this._packs.clear(); }

  async loadIndex(): Promise<RegistryIndex> {
    return { version: 1, updated: new Date().toISOString(), packs: [] };
  }
  async loadPack(_name: string, _version: string): Promise<ContextPack | null> {
    return null;
  }
  async savePack(_pack: ContextPack): Promise<void> {
    // no-op for in-memory
  }
  async deletePack(_name: string, _version: string): Promise<void> {
    // no-op for in-memory
  }
  async saveIndex(_index: RegistryIndex): Promise<void> {
    // no-op for in-memory
  }
}
