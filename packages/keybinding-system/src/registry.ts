import { Emitter, Disposable, DisposableCollection } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { Keybinding, ResolvedKeybinding, KeybindingRegistry } from './types';
import { WhenClauseEvaluator } from './when-clause';
const logger = createLogger('registry');

export interface CommandMetadata {
  command: string;
  name: string;
  description?: string;
  category: string;
}

const COMMAND_CATEGORIES: Record<string, { name: string; category: string }> = {
  'ideia:focus.dashboard': { name: 'Focus Dashboard', category: 'navigation' },
  'ideia:focus.chat': { name: 'Focus Chat', category: 'navigation' },
  'ideia:focus.search': { name: 'Focus Search', category: 'navigation' },
  'ideia:focus.studies': { name: 'Focus Studies', category: 'navigation' },
  'ideia:navigate.next': { name: 'Navigate Next', category: 'navigation' },
  'ideia:navigate.prev': { name: 'Navigate Previous', category: 'navigation' },
  'ideia:navigate.open': { name: 'Open', category: 'navigation' },
  'ideia:navigate.close': { name: 'Close', category: 'navigation' },
  'ideia:edit.save': { name: 'Save', category: 'editing' },
  'ideia:edit.undo': { name: 'Undo', category: 'editing' },
  'ideia:edit.redo': { name: 'Redo', category: 'editing' },
  'ideia:edit.format': { name: 'Format', category: 'editing' },
  'ideia:agent.run': { name: 'Run Agent', category: 'agents' },
  'ideia:agent.stop': { name: 'Stop Agent', category: 'agents' },
  'ideia:agent.status': { name: 'Agent Status', category: 'agents' },
  'ideia:agent.logs': { name: 'Agent Logs', category: 'agents' },
  'ideia:workflow.start': { name: 'Start Workflow', category: 'workflow' },
  'ideia:workflow.pause': { name: 'Pause Workflow', category: 'workflow' },
  'ideia:workflow.resume': { name: 'Resume Workflow', category: 'workflow' },
  'ideia:workflow.cancel': { name: 'Cancel Workflow', category: 'workflow' },
  'ideia:debug.toggle': { name: 'Toggle Debug', category: 'debug' },
  'ideia:debug.step': { name: 'Step Debug', category: 'debug' },
  'ideia:debug.continue': { name: 'Continue Debug', category: 'debug' },
  'ideia:debug.breakpoint': { name: 'Toggle Breakpoint', category: 'debug' },
};

export class DefaultKeybindingRegistry implements KeybindingRegistry {
  private keybindings: Keybinding[] = [];
  private disposables = new DisposableCollection();
  private whenEvaluator = new WhenClauseEvaluator();
  private onChangedEmitter = new Emitter<void>();

  get onKeybindingsChanged() {
    return this.onChangedEmitter.event;
  }

  registerKeybinding(keybinding: Keybinding): Disposable {
    this.keybindings.push(keybinding);
    this.onChangedEmitter.fire(void 0);
    const d = { dispose: () => this.unregisterKeybinding(keybinding) };
    this.disposables.push(d);
    return d;
  }

  getKeybindingsForCommand(command: string): Keybinding[] {
    return this.keybindings.filter((k) => k.command === command);
  }

  getKeybindingsForKey(key: string): Keybinding[] {
    return this.keybindings.filter((k) => k.key === key);
  }

  resolveKeybinding(key: string, contextKeys: string[]): ResolvedKeybinding[] {
    return this.keybindings
      .filter((k) => k.key === key)
      .filter((k) => {
        if (!k.when) return true;
        return this.whenEvaluator.evaluate(k.when, contextKeys);
      })
      .map((k) => ({
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
    this.keybindings = this.keybindings.filter((k) => !(k.command === keybinding.command && k.key === keybinding.key));
    this.onChangedEmitter.fire(void 0);
  }

  getRegisteredCommands(): string[] {
    return Array.from(new Set(this.keybindings.map((k) => k.command)));
  }

  getUnassignedCommands(): string[] {
    const allCommands = Object.keys(COMMAND_CATEGORIES);
    const registered = new Set(this.getRegisteredCommands());
    return allCommands.filter((cmd) => !registered.has(cmd));
  }

  getCommandMetadata(command: string): CommandMetadata | undefined {
    const meta = COMMAND_CATEGORIES[command];
    if (!meta) return undefined;
    return { command, name: meta.name, category: meta.category, description: undefined };
  }

  getCommandsByCategory(category: string): CommandMetadata[] {
    return Object.entries(COMMAND_CATEGORIES)
      .filter(([, v]) => v.category === category)
      .map(([command, v]) => ({ command, ...v }) as any);
  }
}
