import { DefaultModuleRegistry } from './registry';
import { createLogger } from '@ideia/logger';
import { ModuleDefinition, DynamicImportOptions } from './types';
const logger = createLogger('lazy-loader');

export class LazyModuleLoader {
  private registry: DefaultModuleRegistry;
  private loading = new Set<string>();

  constructor(registry: DefaultModuleRegistry) {
    this.registry = registry;
  }

  async loadOnDemand(id: string, options?: DynamicImportOptions): Promise<void> {
    if (this.registry.isLoaded(id) || this.loading.has(id)) return;

    this.loading.add(id);
    try {
      const def = this.registry['definitions'].get(id);
      if (!def) throw new Error(`Module not found: ${id}`);

      if (options?.lazy !== false) {
        await this.registry.load(id);
      }
    } finally {
      this.loading.delete(id);
    }
  }

  registerLazy(def: ModuleDefinition): void {
    this.registry.register(def);
  }
}
