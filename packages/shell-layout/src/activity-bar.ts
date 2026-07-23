import { Disposable } from '@ideia/core-contributions';
import { IActivityBar, ActivityBarItem } from './types';

export class DefaultActivityBar implements IActivityBar {
  private items = new Map<string, ActivityBarItem>();
  private _activeItemId?: string;

  addItem(item: ActivityBarItem): Disposable {
    this.items.set(item.id, item);
    if (item.active) {
      this._activeItemId = item.id;
    }
    return { dispose: () => this.removeItem(item.id) };
  }

  removeItem(id: string): void {
    this.items.delete(id);
    if (this._activeItemId === id) {
      this._activeItemId = undefined;
    }
  }

  setActiveItem(id: string): void {
    if (this.items.has(id)) {
      for (const [, item] of this.items) {
        item.active = item.id === id;
      }
      this._activeItemId = id;
    }
  }

  getActiveItem(): ActivityBarItem | undefined {
    if (!this._activeItemId) return undefined;
    return this.items.get(this._activeItemId);
  }

  getItems(): ActivityBarItem[] {
    return Array.from(this.items.values());
  }

  updateBadge(id: string, badge: number): void {
    const item = this.items.get(id);
    if (item) {
      item.badge = badge;
    }
  }
}
