import fs from 'fs';
import { createLogger } from '@ideia/logger';
import path from 'path';
import { PluginLoader} from './plugin-loader';
import { PluginManifest, PluginContext } from './index';
const logger = createLogger('hot-reload');

export interface HotReloadEvent {
  type: 'reload' | 'unload' | 'error';
  pluginId: string;
  pluginName: string;
  timestamp: number;
  error?: string;
}

export type HotReloadListener = (event: HotReloadEvent) => void;

export class HotReloader {
  private watchers = new Map<string, fs.FSWatcher>();
  private listeners = new Set<HotReloadListener>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private debounceMs: number;

  constructor(debounceMs = 1000) {
    this.debounceMs = debounceMs;
  }

  onReload(listener: HotReloadListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  watch(pluginDir: string, manifest: PluginManifest, context: PluginContext): void {
    if (this.watchers.has(manifest.id)) return;

    const entrypoint = path.resolve(pluginDir, manifest.entrypoint);

    if (!fs.existsSync(entrypoint)) return;

    const watchDir = path.dirname(entrypoint);

    const watcher = fs.watch(watchDir, (eventType, filename) => {
      if (!filename) return;
      const ext = path.extname(filename).toLowerCase();
      if (ext !== '.js' && ext !== '.mjs' && ext !== '.cjs' && ext !== '.json') return;

      const existingTimer = this.debounceTimers.get(manifest.id);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        this.debounceTimers.delete(manifest.id);
        this.handleChange(manifest, context);
      }, this.debounceMs);

      this.debounceTimers.set(manifest.id, timer);
    });

    this.watchers.set(manifest.id, watcher);
  }

  unwatch(pluginId: string): void {
    const watcher = this.watchers.get(pluginId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(pluginId);
    }

    const timer = this.debounceTimers.get(pluginId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(pluginId);
    }
  }

  unloadAll(): void {
    for (const [id] of this.watchers) {
      this.unwatch(id);
    }
  }

  private async handleChange(manifest: PluginManifest, context: PluginContext): Promise<void> {
    try {
      PluginLoader.unload(manifest.id);

      const result = await PluginLoader.load(manifest, context);

      if (result.success && result.instance) {
        this.notifyListeners({
          type: 'reload',
          pluginId: manifest.id,
          pluginName: manifest.name,
          timestamp: Date.now(),
        });
      } else {
        this.notifyListeners({
          type: 'error',
          pluginId: manifest.id,
          pluginName: manifest.name,
          timestamp: Date.now(),
          error: result.error || 'Unknown error during reload',
        });
      }
    } catch (err) {
      this.notifyListeners({
        type: 'error',
        pluginId: manifest.id,
        pluginName: manifest.name,
        timestamp: Date.now(),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private notifyListeners(event: HotReloadEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }
}
