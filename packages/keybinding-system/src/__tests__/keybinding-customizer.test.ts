jest.mock('@ideia/core-contributions', () => ({
  Emitter: class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    event = (listener: (e: T) => void) => {
      this.listeners.push(listener);
      return { dispose: () => { const i = this.listeners.indexOf(listener); if (i >= 0) this.listeners.splice(i, 1); } };
    };
    fire(e: T) { this.listeners.forEach(l => l(e)); }
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
  Command: {},
  CommandHandler: {},
}));

import { KeybindingCustomizer } from '../keybinding-customizer';
import { DefaultKeybindingRegistry } from '../registry';

describe('KeybindingCustomizer', () => {
  let customizer: KeybindingCustomizer;

  beforeEach(() => {
    const registry = new DefaultKeybindingRegistry();
    customizer = new KeybindingCustomizer(registry);
  });

  describe('set', () => {
    it('registers a valid keybinding', () => {
      const result = customizer.set('test.command', 'ctrl+k');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects an invalid keybinding', () => {
      const result = customizer.set('test.command', '');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects malformed key', () => {
      const result = customizer.set('test.command', 'invalid!!');
      expect(result.valid).toBe(false);
    });

    it('detects conflicts between commands', () => {
      customizer.set('cmd.a', 'ctrl+k');
      const result = customizer.set('cmd.b', 'ctrl+k');
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'CONFLICT_DETECTED')).toBe(true);
    });

    it('accepts chord keybindings', () => {
      const result = customizer.set('test.chord', 'ctrl+k ctrl+t');
      expect(result.valid).toBe(true);
    });

    it('rejects chords with more than 2 keys', () => {
      const result = customizer.set('test.chord', 'ctrl+k ctrl+t ctrl+l');
      expect(result.valid).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets a command to its default keybinding', () => {
      customizer.registerDefaults([{ command: 'test.cmd', defaultKeybinding: 'ctrl+t' }]);
      customizer.set('test.cmd', 'ctrl+k');
      const entry = customizer.getAll().find(e => e.command === 'test.cmd');
      expect(entry?.keybinding).toBe('ctrl+k');

      customizer.reset('test.cmd');
      const resetEntry = customizer.getAll().find(e => e.command === 'test.cmd');
      expect(resetEntry?.keybinding).toBe('ctrl+t');
    });

    it('returns false for unknown command', () => {
      expect(customizer.reset('unknown')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('returns all registered entries', () => {
      customizer.set('cmd.a', 'ctrl+a');
      customizer.set('cmd.b', 'ctrl+b');
      const all = customizer.getAll();
      expect(all).toHaveLength(2);
    });

    it('returns empty array when nothing registered', () => {
      expect(customizer.getAll()).toHaveLength(0);
    });
  });

  describe('getConflicts', () => {
    it('detects conflicting keybindings', () => {
      customizer.set('cmd.a', 'ctrl+k');
      customizer.set('cmd.b', 'ctrl+k');
      const conflicts = customizer.getConflicts();
      expect(conflicts.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty when no conflicts', () => {
      customizer.set('cmd.a', 'ctrl+a');
      customizer.set('cmd.b', 'ctrl+b');
      expect(customizer.getConflicts()).toHaveLength(0);
    });
  });

  describe('import / export', () => {
    it('exports keybindings as JSON string', () => {
      customizer.set('cmd.a', 'ctrl+a');
      const exported = customizer.export();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThanOrEqual(1);
    });

    it('imports keybindings from JSON string', () => {
      const json = JSON.stringify([
        { command: 'cmd.a', keybinding: 'ctrl+shift+a' },
        { command: 'cmd.b', keybinding: 'ctrl+shift+b' },
      ]);
      const result = customizer.import(json);
      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('returns errors for invalid JSON', () => {
      const result = customizer.import('invalid json');
      expect(result.imported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('registerDefaults', () => {
    it('registers default keybindings', () => {
      customizer.registerDefaults([
        { command: 'default.cmd', defaultKeybinding: 'ctrl+d' },
      ]);
      const entry = customizer.getAll().find(e => e.command === 'default.cmd');
      expect(entry).toBeDefined();
      expect(entry!.keybinding).toBe('ctrl+d');
      expect(entry!.default).toBe('ctrl+d');
    });
  });
});
