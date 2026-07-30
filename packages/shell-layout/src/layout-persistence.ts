import { ILayoutPersistence, LayoutState, ShellAreaState } from './types';
import { createLogger } from '@ideia/logger';

export class DefaultLayoutPersistence implements ILayoutPersistence {
  private storage = new Map<string, LayoutState>();
  private storageKey = 'ideia-layout';

  async save(layout: LayoutState): Promise<void> {
    const state: LayoutState = {
      ...layout,
      version: 1,
      timestamp: Date.now(),
    };
    this.storage.set(this.storageKey, state);
    try {
      localStorage?.setItem(this.storageKey, JSON.stringify(state));
    } catch {}
  }

  async load(): Promise<LayoutState | undefined> {
    const cached = this.storage.get(this.storageKey);
    if (cached) return cached;

    try {
      const raw = localStorage?.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as LayoutState;
        this.storage.set(this.storageKey, parsed);
        return parsed;
      }
    } catch {}

    return undefined;
  }

  async clear(): Promise<void> {
    this.storage.delete(this.storageKey);
    try {
      localStorage?.removeItem(this.storageKey);
    } catch {}
  }
}
