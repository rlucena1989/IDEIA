import { Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { IStatusBar, StatusBarEntry } from './types';
const logger = createLogger('status-bar');

export class DefaultStatusBar implements IStatusBar {
  private entries = new Map<string, StatusBarEntry>();
  private bgColor = '#007acc';

  addEntry(entry: StatusBarEntry): Disposable {
    this.entries.set(entry.id, entry);
    return { dispose: () => this.removeEntry(entry.id) };
  }

  removeEntry(id: string): void {
    this.entries.delete(id);
  }

  getEntries(): StatusBarEntry[] {
    return Array.from(this.entries.values())
      .sort((a, b) => {
        if (a.alignment !== b.alignment) return a.alignment === 'left' ? -1 : 1;
        return a.priority - b.priority;
      });
  }

  getLeftEntries(): StatusBarEntry[] {
    return this.getEntries().filter(e => e.alignment === 'left');
  }

  getRightEntries(): StatusBarEntry[] {
    return this.getEntries().filter(e => e.alignment === 'right');
  }

  setBackground(color: string): void {
    this.bgColor = color;
  }

  getBackground(): string {
    return this.bgColor;
  }
}
