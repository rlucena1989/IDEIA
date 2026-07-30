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
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DefaultKeybindingRegistry } from '../registry';
import { Cheatsheet } from '../cheatsheet';

describe('Cheatsheet', () => {
  let registry: DefaultKeybindingRegistry;
  let cheatsheet: Cheatsheet;

  beforeEach(() => {
    registry = new DefaultKeybindingRegistry();
    cheatsheet = new Cheatsheet(registry);
  });

  it('can be constructed with registry', () => {
    expect(cheatsheet).toBeDefined();
  });

  it('generate returns text output by default', () => {
    registry.registerKeybinding({ command: 'ideia:focus.dashboard', key: 'ctrl+shift+d' });
    const output = cheatsheet.generate();
    expect(typeof output).toBe('string');
    expect(output).toContain('Keyboard Shortcuts');
    expect(output).toContain('Shift+d');
  });

  it('generate with format html returns HTML', () => {
    registry.registerKeybinding({ command: 'ideia:focus.chat', key: 'ctrl+shift+c' });
    const output = cheatsheet.generate({ format: 'html' });
    expect(output).toContain('<div class="ideia-cheatsheet">');
    expect(output).toContain('<kbd>');
  });

  it('filterByCategory returns formatted category shortcuts', () => {
    registry.registerKeybinding({ command: 'ideia:focus.dashboard', key: 'ctrl+shift+d' });
    const output = cheatsheet.filterByCategory('general');
    expect(output).toContain('Comandos gerais');
    expect(output).toContain('Shift+d');
  });

  it('filterByCategory returns error for unknown category', () => {
    const output = cheatsheet.filterByCategory('nonexistent');
    expect(output).toContain('não encontrada');
  });

  it('search finds shortcuts by command', () => {
    registry.registerKeybinding({ command: 'ideia:edit.save', key: 'ctrl+s' });
    registry.registerKeybinding({ command: 'ideia:edit.undo', key: 'ctrl+z' });

    const results = cheatsheet.search('save');
    expect(results).toHaveLength(1);
    expect(results[0].command).toBe('ideia:edit.save');
  });

  it('search finds shortcuts by key', () => {
    registry.registerKeybinding({ command: 'ideia:edit.save', key: 'ctrl+s' });
    const results = cheatsheet.search('ctrl+s');
    expect(results).toHaveLength(1);
  });

  it('search with no match returns empty', () => {
    expect(cheatsheet.search('zzz_nonexistent')).toEqual([]);
  });
});
