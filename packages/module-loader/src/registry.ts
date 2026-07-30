import { Emitter, Disposable, DisposableCollection } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { ModuleDefinition, LoadedModule, ModuleRegistry } from './types';

export class DefaultModuleRegistry implements ModuleRegistry {
  private definitions = new Map<string, ModuleDefinition>();
  private loaded = new Map<string, LoadedModule>();
  private disposables = new DisposableCollection();
  private onLoadedEmitter = new Emitter<LoadedModule>();

  get onModuleLoaded() { return this.onLoadedEmitter.event; }

  register(moduleDef: ModuleDefinition): Disposable {
    this.definitions.set(moduleDef.id, moduleDef);
    const d = { dispose: () => this.definitions.delete(moduleDef.id) };
    this.disposables.push(d);
    return d;
  }

  async load(id: string): Promise<LoadedModule> {
    if (this.loaded.has(id)) {
      return this.loaded.get(id) as LoadedModule;
    }

    const def = this.definitions.get(id);
    if (!def) {
      throw new Error(`Module not registered: ${id}`);
    }

    for (const dep of def.dependencies) {
      if (!this.loaded.has(dep)) {
        await this.load(dep);
      }
    }

    const loadedModule: LoadedModule = {
      id,
      exports: {},
      dependencies: def.dependencies,
      loadedAt: new Date(),
    };

    this.loaded.set(id, loadedModule);
    this.onLoadedEmitter.fire(loadedModule);
    return loadedModule;
  }

  async loadAll(): Promise<LoadedModule[]> {
    const results: LoadedModule[] = [];
    for (const [id] of this.definitions) {
      if (!this.loaded.has(id)) {
        results.push(await this.load(id));
      }
    }
    return results;
  }

  isLoaded(id: string): boolean {
    return this.loaded.has(id);
  }

  getLoadedModules(): string[] {
    return Array.from(this.loaded.keys());
  }
}
