import { Emitter, Disposable } from '@ideia/core-contributions';
import { ContributionRegistry } from './types';

export class DefaultContributionRegistry implements ContributionRegistry {
  private contributions = new Map<string, unknown[]>();

  register(type: string, value: unknown): Disposable {
    const list = this.contributions.get(type) || [];
    list.push(value);
    this.contributions.set(type, list);
    return { dispose: () => this.unregister(type, value) };
  }

  getContributions<T>(type: string): T[] {
    return (this.contributions.get(type) || []) as T[];
  }

  hasType(type: string): boolean {
    return this.contributions.has(type);
  }

  clear(): void {
    this.contributions.clear();
  }

  private unregister(type: string, value: unknown): void {
    const list = this.contributions.get(type);
    if (!list) return;
    const idx = list.indexOf(value);
    if (idx !== -1) {
      list.splice(idx, 1);
      if (list.length === 0) this.contributions.delete(type);
    }
  }
}
