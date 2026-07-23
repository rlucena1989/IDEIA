import { Emitter, Disposable, DisposableCollection } from '@ideia/core-contributions';
import { Keybinding, ResolvedKeybinding, KeybindingRegistry } from './types';
import { WhenClauseEvaluator } from './when-clause';

export class DefaultKeybindingRegistry implements KeybindingRegistry {
  private keybindings: Keybinding[] = [];
  private disposables = new DisposableCollection();
  private whenEvaluator = new WhenClauseEvaluator();
  private onChangedEmitter = new Emitter<void>();

  get onKeybindingsChanged() { return this.onChangedEmitter.event; }

  registerKeybinding(keybinding: Keybinding): Disposable {
    this.keybindings.push(keybinding);
    this.onChangedEmitter.fire(void 0);
    const d = { dispose: () => this.unregisterKeybinding(keybinding) };
    this.disposables.push(d);
    return d;
  }

  getKeybindingsForCommand(command: string): Keybinding[] {
    return this.keybindings.filter(k => k.command === command);
  }

  getKeybindingsForKey(key: string): Keybinding[] {
    return this.keybindings.filter(k => k.key === key);
  }

  resolveKeybinding(key: string, contextKeys: string[]): ResolvedKeybinding[] {
    return this.keybindings
      .filter(k => k.key === key)
      .filter(k => {
        if (!k.when) return true;
        return this.whenEvaluator.evaluate(k.when, contextKeys);
      })
      .map(k => ({
        command: k.command,
        key: k.key,
        when: k.when,
        contexts: contextKeys,
      }));
  }

  hasKeybinding(key: string, contextKeys: string[]): boolean {
    return this.resolveKeybinding(key, contextKeys).length > 0;
  }

  getAllKeybindings(): Keybinding[] {
    return [...this.keybindings];
  }

  private unregisterKeybinding(keybinding: Keybinding): void {
    this.keybindings = this.keybindings.filter(
      k => !(k.command === keybinding.command && k.key === keybinding.key)
    );
    this.onChangedEmitter.fire(void 0);
  }
}
