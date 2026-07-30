import { IWidget } from '@ideia/views-widgets';
import { createLogger } from '@ideia/logger';
const logger = createLogger('code-splitter');

export type WidgetFactory = () => Promise<IWidget>;

export interface SplitWidgetRegistration {
  id: string;
  label: string;
  area: 'main' | 'left' | 'right' | 'bottom' | 'top';
  factory: WidgetFactory;
  priority?: number;
  preload?: boolean;
}

export interface LoadStats {
  total: number;
  loaded: number;
  failed: number;
  pending: number;
}

export class WidgetCodeSplitter {
  private registry = new Map<string, SplitWidgetRegistration>();
  private loaded = new Map<string, IWidget>();
  private loading = new Map<string, Promise<IWidget>>();
  private preloaded = new Set<string>();
  private failed = new Set<string>();

  register(registration: SplitWidgetRegistration): void {
    this.registry.set(registration.id, registration);
  }

  getRegistration(id: string): SplitWidgetRegistration | undefined {
    return this.registry.get(id);
  }

  async load(id: string): Promise<IWidget> {
    const existing = this.loaded.get(id);
    if (existing) return existing;

    const pending = this.loading.get(id);
    if (pending) return pending;

    const reg = this.registry.get(id);
    if (!reg) throw new Error(`Widget "${id}" not registered`);

    const promise = reg.factory();
    this.loading.set(id, promise);

    try {
      const widget = await promise;
      this.loaded.set(id, widget);
      this.loading.delete(id);
      return widget;
    } catch (err) {
      this.loading.delete(id);
      this.failed.add(id);
      throw err;
    }
  }

  preloadAll(): void {
    for (const [id] of this.registry) {
      if (this.preloaded.has(id)) continue;
      if (this.loaded.has(id) || this.loading.has(id)) continue;
      this.preloaded.add(id);
      this.load(id).catch((err) => logger.warn(`Preload failed for widget "${id}":`, err));
    }
  }

  getPreloaded(): string[] {
    return Array.from(this.preloaded);
  }

  batchPreload(ids: string[]): void {
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 2) {
      batches.push(ids.slice(i, i + 2));
    }
    for (const batch of batches) {
      for (const id of batch) {
        if (this.preloaded.has(id)) continue;
        if (this.loaded.has(id) || this.loading.has(id)) continue;
        this.preloaded.add(id);
        this.load(id).catch((err) => logger.warn(`Batch preload failed for widget "${id}":`, err));
      }
    }
  }

  getLoadStats(): LoadStats {
    return {
      total: this.registry.size,
      loaded: this.loaded.size,
      failed: this.failed.size,
      pending: this.registry.size - this.loaded.size - this.failed.size,
    };
  }

  preload(ids: string[]): void {
    for (const id of ids) {
      const reg = this.registry.get(id);
      if (reg?.preload && !this.loaded.has(id) && !this.loading.has(id)) {
        this.preloaded.add(id);
        this.load(id).catch((err) => logger.warn(`Preload failed for widget "${id}":`, err));
      }
    }
  }

  getLoaded(): string[] {
    return Array.from(this.loaded.keys());
  }

  getPending(): string[] {
    return Array.from(this.registry.keys()).filter(id => !this.loaded.has(id));
  }

  unload(id: string): void {
    this.loaded.delete(id);
    this.loading.delete(id);
    this.preloaded.delete(id);
    this.failed.delete(id);
  }

  clear(): void {
    this.loaded.clear();
    this.loading.clear();
    this.preloaded.clear();
    this.failed.clear();
  }

  estimateBundleImpact(ids: string[]): { loaded: number; pending: number } {
    let loaded = 0;
    let pending = 0;
    for (const id of ids) {
      if (this.loaded.has(id)) loaded++;
      else if (this.registry.has(id)) pending++;
    }
    return { loaded, pending };
  }
}
