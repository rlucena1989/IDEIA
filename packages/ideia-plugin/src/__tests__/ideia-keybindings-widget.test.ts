const mockEl = { style: new Proxy({} as Record<string, string>, { get(t, p) { return p === 'cssText' ? '' : t[p as string]; }, set(t, p, v) { if (typeof p === 'string') t[p] = v; return true; } }), appendChild: () => {}, querySelector: () => null, remove: () => {} };
if (typeof document === 'undefined') (globalThis as Record<string, unknown>).document = { createElement: () => mockEl };

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

import { IDEIA_KeybindingsWidget } from '../browser/ideia-keybindings-widget';
import { KeybindingCustomizer } from '@ideia/keybinding-system';
import { DefaultKeybindingRegistry } from '@ideia/keybinding-system';

describe('IDEIA_KeybindingsWidget', () => {
  let container: HTMLElement;
  let customizer: KeybindingCustomizer;

  beforeEach(() => {
    container = document.createElement('div');
    const registry = new DefaultKeybindingRegistry();
    customizer = new KeybindingCustomizer(registry);
  });

  it('constructs with required props', () => {
    const widget = new IDEIA_KeybindingsWidget({ container, customizer });
    expect(widget).toBeDefined();
  });

  it('mounts and unmounts without error', () => {
    const widget = new IDEIA_KeybindingsWidget({ container, customizer });
    expect(() => widget.mount()).not.toThrow();
    expect(() => widget.unmount()).not.toThrow();
  });

  it('accepts onClose callback', () => {
    const onClose = jest.fn();
    const widget = new IDEIA_KeybindingsWidget({ container, customizer, onClose });
    expect(widget).toBeDefined();
  });

  it('mount creates the widget container', () => {
    const widget = new IDEIA_KeybindingsWidget({ container, customizer });
    widget.mount();
    const el = container.querySelector('#ideia-keybindings');
    expect(el).toBeDefined();
    widget.unmount();
  });
});
