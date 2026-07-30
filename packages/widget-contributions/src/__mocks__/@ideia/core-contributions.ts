export class Emitter<T> {
  private listeners: Array<(e: T) => void> = [];
  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => { const i = this.listeners.indexOf(listener); if (i >= 0) this.listeners.splice(i, 1); } };
  };
  fire(e: T) { this.listeners.forEach(l => l(e)); }
  dispose() { this.listeners = []; }
}

export class DisposableCollection {
  private disposables: Array<{ dispose: () => void }> = [];
  push(d: { dispose: () => void }) { this.disposables.push(d); return d; }
  dispose() { this.disposables.forEach(d => d.dispose()); this.disposables = []; }
}

export class DefaultContributionProvider<T> {
  contributions: T[] = [];
  getContributions() { return this.contributions; }
}

export function bindContributionProvider() {}
export function sortByPriority() {}
export function highestPriority() {}

export const PRIORITY = { LOW: 100, NORMAL: 500, HIGH: 1000, CRITICAL: 2000 };
export const ContributionType = { Tool: 'tool', Agent: 'agent', View: 'view', Command: 'command', Widget: 'widget', Theme: 'theme', Keybinding: 'keybinding', Menu: 'menu', Preference: 'preference', Language: 'language' };
