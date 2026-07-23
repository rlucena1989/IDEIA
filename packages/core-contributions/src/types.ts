export interface ContributionProvider<T> {
  getContributions(): T[];
  hasContributions(): boolean;
  onContributionsChanged: Event<void>;
}

export interface Contribution<T> {
  id: string;
  label?: string;
  description?: string;
  enabled?: boolean;
}

export interface Disposable {
  dispose(): void;
}

export interface Event<T> {
  (listener: (event: T) => void, thisArgs?: unknown): Disposable;
}

export class Emitter<T> {
  private listeners: Array<{ listener: (event: T) => void; thisArgs?: unknown }> = [];
  private disposed = false;

  get event(): Event<T> {
    return (listener: (event: T) => void, thisArgs?: unknown): Disposable => {
      this.listeners.push({ listener, thisArgs });
      return { dispose: () => this.removeListener(listener) };
    };
  }

  fire(event: T): void {
    if (this.disposed) return;
    for (const entry of this.listeners) {
      entry.listener.call(entry.thisArgs, event);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.listeners = [];
  }

  private removeListener(listener: (event: T) => void): void {
    this.listeners = this.listeners.filter(l => l.listener !== listener);
  }
}

export class DisposableCollection implements Disposable {
  private disposables: Disposable[] = [];

  push(disposable: Disposable): void {
    this.disposables.push(disposable);
  }

  dispose(): void {
    for (const d of this.disposables) {
      try { d.dispose(); } catch { }
    }
    this.disposables = [];
  }
}

export class DefaultContributionProvider<T extends Contribution> implements ContributionProvider<T> {
  private contributions: T[] = [];
  private onChangedEmitter = new Emitter<void>();

  get onContributionsChanged(): Event<void> {
    return this.onChangedEmitter.event;
  }

  constructor(contributions?: T[]) {
    if (contributions) {
      this.contributions = [...contributions];
    }
  }

  getContributions(): T[] {
    return [...this.contributions];
  }

  hasContributions(): boolean {
    return this.contributions.length > 0;
  }

  register(contribution: T): Disposable {
    this.contributions.push(contribution);
    this.onChangedEmitter.fire(void 0);
    return { dispose: () => this.unregister(contribution.id) };
  }

  unregister(id: string): void {
    this.contributions = this.contributions.filter(c => c.id !== id);
    this.onChangedEmitter.fire(void 0);
  }

  get(id: string): T | undefined {
    return this.contributions.find(c => c.id === id);
  }
}

export function bindContributionProvider<T extends Contribution>(
  contributions: DefaultContributionProvider<T>
): ContributionProvider<T> {
  return contributions;
}

export enum ContributionType {
  Command = 'command',
  Menu = 'menu',
  Keybinding = 'keybinding',
  View = 'view',
  Widget = 'widget',
  Tool = 'tool',
  Agent = 'agent',
  Preference = 'preference',
  Theme = 'theme',
  Custom = 'custom'
}

export interface ContributionMetadata {
  type: ContributionType;
  id: string;
  name: string;
  version?: string;
  provider?: string;
  tags?: string[];
}
