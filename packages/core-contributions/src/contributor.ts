import { Disposable } from './types';
import { createLogger } from '@ideia/logger';

export interface Contributor<T> {
  contribute(registry: T): void;
}

export interface ContributionRegistry {
  register<T>(type: string, contribution: T): Disposable;
  getContributions<T>(type: string): T[];
  hasType(type: string): boolean;
  dispose(): void;
}

export class DefaultContributionRegistry implements ContributionRegistry {
  private contributions = new Map<string, unknown[]>();
  private disposables: Disposable[] = [];

  register<T>(type: string, contribution: T): Disposable {
    const list = this.contributions.get(type) || [];
    list.push(contribution);
    this.contributions.set(type, list);
    const disposable = { dispose: () => this.unregister(type, contribution) };
    this.disposables.push(disposable);
    return disposable;
  }

  getContributions<T>(type: string): T[] {
    return (this.contributions.get(type) || []) as T[];
  }

  hasType(type: string): boolean {
    return this.contributions.has(type);
  }

  dispose(): void {
    for (const d of this.disposables) {
      try { d.dispose(); } catch { }
    }
    this.contributions.clear();
    this.disposables = [];
  }

  private unregister<T>(type: string, contribution: T): void {
    const list = this.contributions.get(type);
    if (!list) return;
    const idx = list.indexOf(contribution);
    if (idx !== -1) {
      list.splice(idx, 1);
      if (list.length === 0) this.contributions.delete(type);
    }
  }
}
