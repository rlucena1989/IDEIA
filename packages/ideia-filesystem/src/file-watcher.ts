import { Emitter, Disposable } from '@ideia/core-contributions';
import { FileWatcherService, FileChangeEvent, FileChangeType, WatchOptions } from './types';

export class DefaultFileWatcherService implements FileWatcherService {
  private watchedPaths = new Map<string, Set<string>>();
  private onChangedEmitter = new Emitter<FileChangeEvent>();

  get onFileChanged() { return this.onChangedEmitter.event; }

  watch(uri: string, options?: WatchOptions): Disposable {
    const watcherId = `watcher-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const watchers = this.watchedPaths.get(uri) || new Set();
    watchers.add(watcherId);
    this.watchedPaths.set(uri, watchers);
    return { dispose: () => this.unwatch(uri, watcherId) };
  }

  reportChange(uri: string, type: FileChangeType): void {
    this.onChangedEmitter.fire({ uri, type });
  }

  private unwatch(uri: string, watcherId: string): void {
    const watchers = this.watchedPaths.get(uri);
    if (watchers) {
      watchers.delete(watcherId);
      if (watchers.size === 0) this.watchedPaths.delete(uri);
    }
  }
}
