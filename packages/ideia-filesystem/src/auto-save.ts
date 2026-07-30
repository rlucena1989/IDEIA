import { Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
const logger = createLogger('auto-save');

interface AutoSaveEntry {
  timer: ReturnType<typeof setTimeout> | null;
  pending: boolean;
}

export class AutoSave {
  private static DEFAULT_DELAY = 2000;

  private entries = new Map<string, AutoSaveEntry>();
  private delay: number;

  constructor(delay?: number) {
    this.delay = delay ?? AutoSave.DEFAULT_DELAY;
  }

  startWatching(file: string, onSave: (file: string) => void): Disposable {
    const existing = this.entries.get(file);
    if (existing && existing.pending) {
      return { dispose: () => this.stopWatching(file) };
    }

    const entry: AutoSaveEntry = { timer: null, pending: false };
    this.entries.set(file, entry);

    const saveFn = (): void => {
      onSave(file);
      entry.pending = false;
    };

    const triggerTimer = (): void => {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      entry.pending = true;
      entry.timer = setTimeout(saveFn, this.delay);
    };

    triggerTimer();

    return {
      dispose: () => {
        this.stopWatching(file);
      },
    };
  }

  stopWatching(file: string): void {
    const entry = this.entries.get(file);
    if (!entry) return;
    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    this.entries.delete(file);
  }

  saveNow(file: string): boolean {
    const entry = this.entries.get(file);
    if (!entry || !entry.pending) return false;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    entry.pending = false;
    return true;
  }

  getPendingFiles(): string[] {
    const files: string[] = [];
    for (const [file, entry] of this.entries) {
      if (entry.pending) files.push(file);
    }
    return files;
  }

  dispose(): void {
    for (const file of this.entries.keys()) {
      this.stopWatching(file);
    }
  }
}
