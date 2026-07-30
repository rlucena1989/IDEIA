export interface FileAction {
  type: 'rename' | 'delete' | 'move' | 'create';
  path: string;
  timestamp: string;
  previousPath?: string;
}

export class HistoryManager {
  private static MAX_ACTIONS = 50;

  private actions: FileAction[] = [];
  private pointer = -1;

  push(action: Omit<FileAction, 'timestamp'>): void {
    const entry: FileAction = { ...action, timestamp: new Date().toISOString() };

    if (this.pointer < this.actions.length - 1) {
      this.actions = this.actions.slice(0, this.pointer + 1);
    }

    this.actions.push(entry);

    if (this.actions.length > HistoryManager.MAX_ACTIONS) {
      this.actions.shift();
    } else {
      this.pointer++;
    }
  }

  undo(): FileAction | undefined {
    if (this.pointer < 0) return undefined;
    const action = this.actions[this.pointer];
    this.pointer--;
    return action;
  }

  redo(): FileAction | undefined {
    if (this.pointer >= this.actions.length - 1) return undefined;
    this.pointer++;
    return this.actions[this.pointer];
  }

  getHistory(): FileAction[] {
    return [...this.actions];
  }

  clear(): void {
    this.actions = [];
    this.pointer = -1;
  }
}
