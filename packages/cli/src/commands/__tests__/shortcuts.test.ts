jest.mock('@ideia/core-contributions', () => ({
  Emitter: class Emitter {
    private listeners: Array<(e: unknown) => void> = [];
    event = (listener: (e: unknown) => void) => {
      this.listeners.push(listener);
      return { dispose: () => { const i = this.listeners.indexOf(listener); if (i >= 0) this.listeners.splice(i, 1); } };
    };
    fire(e: unknown) { this.listeners.forEach(l => l(e)); }
    dispose() { this.listeners = []; }
  },
  DisposableCollection: class DisposableCollection {
    private disposables: Array<{ dispose: () => void }> = [];
    push(d: { dispose: () => void }) { this.disposables.push(d); return d; }
    dispose() { this.disposables.forEach(d => d.dispose()); this.disposables = []; }
  },
}));

jest.mock('@ideia/command-system', () => ({
  DefaultCommandRegistry: jest.fn(),
}));

jest.mock('@ideia/keybinding-system', () => {
  const mockRegistry = {
    registerKeybinding: jest.fn(),
    getKeybindingsForCommand: jest.fn().mockReturnValue([]),
    getKeybindingsForKey: jest.fn().mockReturnValue([]),
    getAllKeybindings: jest.fn().mockReturnValue([
      { command: 'ideia:focus.dashboard', key: 'ctrl+shift+d' },
      { command: 'ideia:edit.save', key: 'ctrl+s' },
    ]),
    resolveKeybinding: jest.fn().mockReturnValue([]),
    hasKeybinding: jest.fn().mockReturnValue(false),
    onKeybindingsChanged: jest.fn(),
  };
  return {
    DefaultKeybindingRegistry: jest.fn().mockImplementation(() => mockRegistry),
    Cheatsheet: jest.fn().mockImplementation(() => ({
      generate: jest.fn().mockReturnValue('=== IDEIA Keyboard Shortcuts ===\n  ctrl+shift+d   ideia:focus.dashboard\n  ctrl+s         ideia:edit.save'),
      filterByCategory: jest.fn().mockReturnValue('[GENERAL] Comandos gerais\n  ctrl+shift+d → ideia:focus.dashboard'),
      search: jest.fn().mockReturnValue([{ command: 'ideia:edit.save', key: 'ctrl+s' }]),
    })),
  };
});

import { Command } from 'commander';
import { shortcutsCommand } from '../shortcuts';

describe('shortcutsCommand', () => {
  it('returns a Commander Command with name shortcuts', () => {
    const cmd = shortcutsCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('shortcuts');
  });

  it('has description', () => {
    const cmd = shortcutsCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has list sub-command', () => {
    const cmd = shortcutsCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('list');
  });

  it('has category sub-command', () => {
    const cmd = shortcutsCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('category');
  });

  it('has search sub-command', () => {
    const cmd = shortcutsCommand();
    const names = cmd.commands.map((c: Command) => c.name());
    expect(names).toContain('search');
  });
});
