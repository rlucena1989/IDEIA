export interface ShortcutDefinition {
  id: string;
  keys: string;
  description: string;
  action: () => void;
  platform?: 'win32' | 'darwin' | 'linux';
}

export class GlobalShortcutManager {
  private shortcuts: Map<string, ShortcutDefinition> = new Map();

  register(shortcut: ShortcutDefinition): boolean {
    const key = `${shortcut.id}:${shortcut.keys}`;
    if (this.shortcuts.has(key)) return false;
    this.shortcuts.set(key, shortcut);
    return true;
  }

  unregister(id: string): boolean {
    for (const [key, value] of this.shortcuts) {
      if (value.id === id) return this.shortcuts.delete(key);
    }
    return false;
  }

  unregisterAll(): void {
    this.shortcuts.clear();
  }

  getRegistered(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  isRegistered(id: string): boolean {
    for (const value of this.shortcuts.values()) {
      if (value.id === id) return true;
    }
    return false;
  }

  getDefaults(): ShortcutDefinition[] {
    return [
      { id: 'quick-open', keys: 'CmdOrCtrl+P', description: 'Quick open file', action: () => {} },
      { id: 'toggle-terminal', keys: 'CmdOrCtrl+J', description: 'Toggle terminal', action: () => {} },
      { id: 'open-command-palette', keys: 'CmdOrCtrl+Shift+P', description: 'Command palette', action: () => {} },
      { id: 'toggle-sidebar', keys: 'CmdOrCtrl+B', description: 'Toggle sidebar', action: () => {} },
      { id: 'run-agent', keys: 'CmdOrCtrl+Enter', description: 'Run active agent', action: () => {} },
      { id: 'new-file', keys: 'CmdOrCtrl+N', description: 'New file', action: () => {} },
      { id: 'save', keys: 'CmdOrCtrl+S', description: 'Save file', action: () => {} },
      { id: 'close-tab', keys: 'CmdOrCtrl+W', description: 'Close current tab', action: () => {} },
    ];
  }
}
