export interface Disposable {
  dispose(): void;
}

export interface Event<T> {
  (listener: (event: T) => void, thisArgs?: unknown): Disposable;
}

export class Emitter<T> {
  private listeners: Array<{ listener: (event: T) => void; thisArgs?: unknown }> = [];
  get event(): Event<T> {
    return (listener: (event: T) => void, thisArgs?: unknown): Disposable => {
      this.listeners.push({ listener, thisArgs });
      return { dispose: () => this.removeListener(listener) };
    };
  }
  fire(event: T): void { for (const entry of this.listeners) entry.listener.call(entry.thisArgs, event); }
  dispose(): void { this.listeners = []; }
  private removeListener(listener: (event: T) => void): void {
    this.listeners = this.listeners.filter(l => l.listener !== listener);
  }
}

export class DisposableCollection implements Disposable {
  private disposables: Disposable[] = [];
  push(disposable: Disposable): void { this.disposables.push(disposable); }
  dispose(): void { for (const d of this.disposables) { try { d.dispose(); } catch { } } this.disposables = []; }
}
