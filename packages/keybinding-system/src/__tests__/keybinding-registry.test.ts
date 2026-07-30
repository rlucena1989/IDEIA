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
  ContributionProvider: jest.fn(),
  DefaultContributionProvider: jest.fn(),
}));

jest.mock('@ideia/command-system', () => ({
  DefaultCommandRegistry: jest.fn(),
  Command: {},
  CommandHandler: {},
}));

import { DefaultKeybindingRegistry } from '../registry';
import { Keybinding, ResolvedKeybinding, KeybindingRegistry, ContextKeyService } from '../types';

describe('Keybinding types', () => {
  it('Keybinding shape is valid', () => {
    const kb: Keybinding = {
      command: 'test.action',
      key: 'ctrl+k',
      when: 'editorFocus',
      args: [1, 2],
      priority: 10,
    };
    expect(kb.command).toBe('test.action');
    expect(kb.key).toBe('ctrl+k');
    expect(kb.when).toBe('editorFocus');
    expect(kb.args).toEqual([1, 2]);
    expect(kb.priority).toBe(10);
  });

  it('Keybinding with only required fields', () => {
    const kb: Keybinding = { command: 'min.action', key: 'ctrl+m' };
    expect(kb.command).toBe('min.action');
    expect(kb.key).toBe('ctrl+m');
    expect(kb.when).toBeUndefined();
  });

  it('ResolvedKeybinding shape is valid', () => {
    const rkb: ResolvedKeybinding = {
      command: 'test.action',
      key: 'ctrl+k',
      when: 'editorFocus',
      contexts: ['editor', 'text'],
      chord: 'ctrl+k ctrl+t',
    };
    expect(rkb.command).toBe('test.action');
    expect(rkb.contexts).toContain('editor');
    expect(rkb.chord).toBe('ctrl+k ctrl+t');
  });

  it('KeybindingRegistry interface is implemented by DefaultKeybindingRegistry', () => {
    const registry: KeybindingRegistry = new DefaultKeybindingRegistry();
    expect(registry).toBeDefined();
  });

  it('ContextKeyService interface shape is valid', () => {
    const service: ContextKeyService = {
      getContext: () => 'value',
      setContext: () => {},
      getContextKeys: () => new Map(),
      matches: () => true,
      onContextChanged: jest.fn(),
    };
    expect(service.getContext('key')).toBe('value');
    expect(service.matches('expr')).toBe(true);
  });
});

describe('DefaultKeybindingRegistry', () => {
  let registry: DefaultKeybindingRegistry;

  beforeEach(() => {
    registry = new DefaultKeybindingRegistry();
  });

  describe('registerKeybinding', () => {
    it('registers a keybinding and returns a Disposable', () => {
      const kb: Keybinding = { command: 'test.action', key: 'ctrl+t' };
      const disposable = registry.registerKeybinding(kb);

      expect(registry.getKeybindingsForCommand('test.action')).toHaveLength(1);
      expect(typeof disposable.dispose).toBe('function');
    });

    it('allows multiple keybindings for the same command', () => {
      registry.registerKeybinding({ command: 'test.action', key: 'ctrl+t' });
      registry.registerKeybinding({ command: 'test.action', key: 'ctrl+shift+t' });

      expect(registry.getKeybindingsForCommand('test.action')).toHaveLength(2);
    });

    it('removes the keybinding when disposed', () => {
      const kb: Keybinding = { command: 'test.temp', key: 'ctrl+x' };
      const disposable = registry.registerKeybinding(kb);

      expect(registry.getKeybindingsForCommand('test.temp')).toHaveLength(1);
      disposable.dispose();
      expect(registry.getKeybindingsForCommand('test.temp')).toHaveLength(0);
    });

    it('dispose removes only matching command+key combination', () => {
      const kb1: Keybinding = { command: 'test.cmd', key: 'ctrl+a' };
      const kb2: Keybinding = { command: 'test.cmd', key: 'ctrl+b' };
      registry.registerKeybinding(kb1);
      const disp2 = registry.registerKeybinding(kb2);

      disp2.dispose();
      const remaining = registry.getKeybindingsForCommand('test.cmd');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].key).toBe('ctrl+a');
    });

    it('getAllKeybindings returns all registered keybindings', () => {
      registry.registerKeybinding({ command: 'a', key: 'ctrl+a' });
      registry.registerKeybinding({ command: 'b', key: 'ctrl+b' });

      expect(registry.getAllKeybindings()).toHaveLength(2);
    });
  });

  describe('getKeybindingsForCommand', () => {
    it('returns empty array for unregistered command', () => {
      expect(registry.getKeybindingsForCommand('no.such')).toEqual([]);
    });

    it('returns all keybindings for a given command', () => {
      registry.registerKeybinding({ command: 'edit.save', key: 'ctrl+s' });
      registry.registerKeybinding({ command: 'edit.save', key: 'ctrl+shift+s' });
      registry.registerKeybinding({ command: 'edit.open', key: 'ctrl+o' });

      const bindings = registry.getKeybindingsForCommand('edit.save');
      expect(bindings).toHaveLength(2);
      expect(bindings.map(b => b.key)).toEqual(['ctrl+s', 'ctrl+shift+s']);
    });
  });

  describe('getKeybindingsForKey', () => {
    it('returns empty array for unregistered key', () => {
      expect(registry.getKeybindingsForKey('alt+f4')).toEqual([]);
    });

    it('returns all keybindings for a given key', () => {
      registry.registerKeybinding({ command: 'cmd.a', key: 'ctrl+k' });
      registry.registerKeybinding({ command: 'cmd.b', key: 'ctrl+k' });
      registry.registerKeybinding({ command: 'cmd.c', key: 'ctrl+j' });

      const bindings = registry.getKeybindingsForKey('ctrl+k');
      expect(bindings).toHaveLength(2);
      expect(bindings.map(b => b.command)).toEqual(['cmd.a', 'cmd.b']);
    });
  });

  describe('resolveKeybinding', () => {
    it('returns matching keybindings with context attached', () => {
      registry.registerKeybinding({ command: 'edit.save', key: 'ctrl+s' });
      registry.registerKeybinding({ command: 'edit.saveAs', key: 'ctrl+s', when: 'editorFocus' });

      const resolved = registry.resolveKeybinding('ctrl+s', ['editorFocus']);
      expect(resolved).toHaveLength(2);
      expect(resolved[0].contexts).toEqual(['editorFocus']);
    });

    it('filters by when clause when contexts are provided', () => {
      registry.registerKeybinding({ command: 'edit.save', key: 'ctrl+s' });
      registry.registerKeybinding({ command: 'term.copy', key: 'ctrl+s', when: 'terminalFocus' });

      const inEditor = registry.resolveKeybinding('ctrl+s', ['editorFocus']);
      expect(inEditor).toHaveLength(1);
      expect(inEditor[0].command).toBe('edit.save');

      const inTerminal = registry.resolveKeybinding('ctrl+s', ['terminalFocus']);
      expect(inTerminal).toHaveLength(2);
    });

    it('returns empty when no keybinding matches the key', () => {
      expect(registry.resolveKeybinding('alt+F1', [])).toEqual([]);
    });

    it('matches keybindings without when clause in any context', () => {
      registry.registerKeybinding({ command: 'global.action', key: 'ctrl+g' });

      const resolved = registry.resolveKeybinding('ctrl+g', ['randomContext']);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].command).toBe('global.action');
    });
  });

  describe('hasKeybinding', () => {
    it('returns true when a matching keybinding exists in context', () => {
      registry.registerKeybinding({ command: 'edit.save', key: 'ctrl+s' });

      expect(registry.hasKeybinding('ctrl+s', [])).toBe(true);
    });

    it('returns false when no keybinding matches the key', () => {
      expect(registry.hasKeybinding('ctrl+q', [])).toBe(false);
    });

    it('considers when clause context', () => {
      registry.registerKeybinding({ command: 'edit.save', key: 'ctrl+s', when: 'editorFocus' });

      expect(registry.hasKeybinding('ctrl+s', ['editorFocus'])).toBe(true);
      expect(registry.hasKeybinding('ctrl+s', ['terminalFocus'])).toBe(false);
    });
  });

  describe('events', () => {
    it('fires onKeybindingsChanged when a keybinding is registered', () => {
      const listener = jest.fn();
      registry.onKeybindingsChanged(listener);

      registry.registerKeybinding({ command: 'test.a', key: 'ctrl+a' });

      expect(listener).toHaveBeenCalled();
    });

    it('fires onKeybindingsChanged when a keybinding is disposed', () => {
      const listener = jest.fn();
      registry.onKeybindingsChanged(listener);

      const disp = registry.registerKeybinding({ command: 'test.b', key: 'ctrl+b' });
      listener.mockClear();
      disp.dispose();

      expect(listener).toHaveBeenCalled();
    });
  });
});
