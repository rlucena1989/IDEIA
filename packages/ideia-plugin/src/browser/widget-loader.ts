import { injectable } from '@theia/core/shared/inversify';

export interface LazyWidget {
  id: string;
  label: string;
  load: () => Promise<{ default: new (...args: unknown[]) => unknown }>;
}

export interface WidgetLoadResult {
  id: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

@injectable()
export class WidgetLoader {
  private registry = new Map<string, LazyWidget>();
  private loaded = new Set<string>();
  private loading = new Map<string, Promise<WidgetLoadResult>>();

  register(widget: LazyWidget): void {
    this.registry.set(widget.id, widget);
  }

  async load(widgetId: string): Promise<WidgetLoadResult> {
    const widget = this.registry.get(widgetId);
    if (!widget) {
      return { id: widgetId, success: false, durationMs: 0, error: `Widget "${widgetId}" not registered` };
    }

    if (this.loaded.has(widgetId)) {
      return { id: widgetId, success: true, durationMs: 0 };
    }

    const existing = this.loading.get(widgetId);
    if (existing) return existing;

    const promise = this.doLoad(widget);
    this.loading.set(widgetId, promise);
    const result = await promise;
    this.loading.delete(widgetId);

    if (result.success) {
      this.loaded.add(widgetId);
    }

    return result;
  }

  private async doLoad(widget: LazyWidget): Promise<WidgetLoadResult> {
    const start = performance.now();
    try {
      await widget.load();
      return {
        id: widget.id,
        success: true,
        durationMs: Math.round(performance.now() - start),
      };
    } catch (_error) {
      return {
        id: widget.id,
        success: false,
        durationMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  isLoaded(widgetId: string): boolean {
    return this.loaded.has(widgetId);
  }

  getLoadedCount(): number {
    return this.loaded.size;
  }

  getRegisteredCount(): number {
    return this.registry.size;
  }

  unload(widgetId: string): void {
    this.loaded.delete(widgetId);
  }
}
