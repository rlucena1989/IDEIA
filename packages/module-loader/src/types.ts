import { Disposable } from '@ideia/core-contributions';

export interface ModuleDefinition {
  id: string;
  path: string;
  enabled: boolean;
  dependencies: string[];
  metadata: Record<string, unknown>;
}

export interface LoadedModule {
  id: string;
  exports: Record<string, unknown>;
  dependencies: string[];
  loadedAt: Date;
}

export interface ModuleRegistry {
  register(moduleDef: ModuleDefinition): Disposable;
  load(id: string): Promise<LoadedModule>;
  loadAll(): Promise<LoadedModule[]>;
  isLoaded(id: string): boolean;
  getLoadedModules(): string[];
  onModuleLoaded: import('@ideia/core-contributions').Event<LoadedModule>;
}

export interface DynamicImportOptions {
  lazy?: boolean;
  timeout?: number;
  retries?: number;
}
