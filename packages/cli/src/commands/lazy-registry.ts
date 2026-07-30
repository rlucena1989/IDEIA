import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('lazy-registry');

export interface LazyCommandEntry {
  name: string;
  modulePath: string;
  factoryFn: string;
  alias?: string;
  description?: string;
}

export class LazyCommandRegistry {
  private entries: Map<string, LazyCommandEntry> = new Map();
  private loaded: Map<string, Command> = new Map();
  private loadCount = 0;

  register(entry: LazyCommandEntry): void {
    this.entries.set(entry.name, entry);
  }

  async load(name: string): Promise<Command | undefined> {
    const cached = this.loaded.get(name);
    if (cached) return cached;

    const entry = this.entries.get(name);
    if (!entry) return undefined;

    try {
      const mod = await import(entry.modulePath);
      const factory = mod[entry.factoryFn];
      if (typeof factory !== 'function') {
        throw new Error(`Factory ${entry.factoryFn} not found in ${entry.modulePath}`);
      }
      const cmd = factory();
      this.loaded.set(name, cmd);
      this.loadCount++;
      return cmd;
    } catch (err) {
      return undefined;
    }
  }

  getLoadedCount(): number {
    return this.loadCount;
  }

  getEntryNames(): string[] {
    return Array.from(this.entries.keys());
  }

  isLoaded(name: string): boolean {
    return this.loaded.has(name);
  }

  clearCache(): void {
    this.loaded.clear();
    this.loadCount = 0;
  }
}
