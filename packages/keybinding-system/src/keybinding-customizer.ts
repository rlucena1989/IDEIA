import { KeybindingValidator, ValidationResult } from './keybinding-validator';
import { createLogger } from '@ideia/logger';
import { DefaultKeybindingRegistry } from './registry';
const logger = createLogger('keybinding-customizer');

export interface KeybindingEntry {
  command: string;
  keybinding: string;
  default: string;
  when?: string;
}

export interface ConflictInfo {
  command: string;
  keybinding: string;
  conflictingWith: string[];
}

export type PresetScheme = 'default' | 'vim-mode' | 'emacs-mode';

const PRESET_SCHEMES: Record<PresetScheme, Array<{ command: string; keybinding: string }>> = {
  'default': [
    { command: 'ideia:command.palette', keybinding: 'ctrl+shift+p' },
    { command: 'ideia:focus.dashboard', keybinding: 'ctrl+shift+d' },
    { command: 'ideia:focus.chat', keybinding: 'ctrl+shift+c' },
    { command: 'ideia:agent.run', keybinding: 'ctrl+enter' },
    { command: 'ideia:edit.save', keybinding: 'ctrl+s' },
    { command: 'ideia:edit.undo', keybinding: 'ctrl+z' },
    { command: 'ideia:edit.redo', keybinding: 'ctrl+shift+z' },
    { command: 'ideia:navigate.next', keybinding: 'ctrl+tab' },
    { command: 'ideia:navigate.prev', keybinding: 'ctrl+shift+tab' },
  ],
  'vim-mode': [
    { command: 'ideia:command.palette', keybinding: 'ctrl+p' },
    { command: 'ideia:focus.dashboard', keybinding: 'ctrl+w d' },
    { command: 'ideia:focus.chat', keybinding: 'ctrl+w c' },
    { command: 'ideia:edit.save', keybinding: ':w' },
    { command: 'ideia:edit.undo', keybinding: 'u' },
    { command: 'ideia:edit.redo', keybinding: 'ctrl+r' },
    { command: 'ideia:navigate.next', keybinding: 'ctrl+w w' },
    { command: 'ideia:navigate.prev', keybinding: 'ctrl+w shift+w' },
  ],
  'emacs-mode': [
    { command: 'ideia:command.palette', keybinding: 'ctrl+x ctrl+p' },
    { command: 'ideia:focus.dashboard', keybinding: 'ctrl+x d' },
    { command: 'ideia:focus.chat', keybinding: 'ctrl+x c' },
    { command: 'ideia:edit.save', keybinding: 'ctrl+x ctrl+s' },
    { command: 'ideia:edit.undo', keybinding: 'ctrl+_' },
    { command: 'ideia:edit.redo', keybinding: 'ctrl+shift+-' },
    { command: 'ideia:navigate.next', keybinding: 'ctrl+x o' },
  ],
};

export class KeybindingCustomizer {
  private entries: Map<string, KeybindingEntry> = new Map();
  private defaults: Map<string, string> = new Map();
  private validator = new KeybindingValidator();
  private registry: DefaultKeybindingRegistry;

  constructor(registry?: DefaultKeybindingRegistry) {
    this.registry = registry ?? new DefaultKeybindingRegistry();
  }

  set(command: string, keybinding: string): ValidationResult {
    const validation = this.validator.validate(keybinding);
    if (!validation.valid) {
      return validation;
    }

    const existing = this.getAllKeybindings().filter(k => k.command !== command);
    const conflicts = this.validator.findConflicts(keybinding, existing.map(e => e.keybinding));

    if (conflicts.length > 0) {
      validation.warnings.push({
        code: 'CONFLICT_DETECTED',
        message: `Keybinding conflicts with: ${conflicts.join(', ')}`,
      });
    }

    const entry = this.entries.get(command);
    if (entry) {
      entry.keybinding = keybinding;
    } else {
      const defaultKb = this.defaults.get(command) ?? keybinding;
      this.entries.set(command, {
        command,
        keybinding,
        default: defaultKb,
      });
    }

    this.registry.registerKeybinding({ command, key: keybinding });
    return validation;
  }

  reset(command: string): boolean {
    const defaultKb = this.defaults.get(command);
    if (!defaultKb) return false;
    this.entries.set(command, {
      command,
      keybinding: defaultKb,
      default: defaultKb,
    });
    return true;
  }

  getAll(): KeybindingEntry[] {
    return Array.from(this.entries.values());
  }

  getConflicts(): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const entries = this.getAll();

    for (let i = 0; i < entries.length; i++) {
      const conflictingWith: string[] = [];
      for (let j = 0; j < entries.length; j++) {
        if (i !== j && entries[i].keybinding === entries[j].keybinding) {
          conflictingWith.push(entries[j].command);
        }
      }
      if (conflictingWith.length > 0) {
        conflicts.push({
          command: entries[i].command,
          keybinding: entries[i].keybinding,
          conflictingWith,
        });
      }
    }

    return conflicts;
  }

  import(json: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data: Array<{ command: string; keybinding: string }> = JSON.parse(json);
      for (const item of data) {
        const result = this.set(item.command, item.keybinding);
        if (result.valid) {
          imported++;
        } else {
          errors.push(`Failed to import "${item.command}": ${result.errors.map(e => e.message).join(', ')}`);
        }
      }
    } catch {
      errors.push('Invalid JSON format');
    }

    return { imported, errors };
  }

  export(): string {
    const data = this.getAll().map(e => ({
      command: e.command,
      keybinding: e.keybinding,
    }));
    return JSON.stringify(data, null, 2);
  }

  registerDefaults(defaults: Array<{ command: string; defaultKeybinding: string }>): void {
    for (const d of defaults) {
      this.defaults.set(d.command, d.defaultKeybinding);
      if (!this.entries.has(d.command)) {
        this.entries.set(d.command, {
          command: d.command,
          keybinding: d.defaultKeybinding,
          default: d.defaultKeybinding,
        });
      }
    }
  }

  getCustomizations(): KeybindingEntry[] {
    return this.getAll().filter(e => e.keybinding !== e.default);
  }

  resetAll(): void {
    for (const [command, defaultKb] of this.defaults) {
      this.entries.set(command, {
        command,
        keybinding: defaultKb,
        default: defaultKb,
      });
    }
  }

  resetCategory(category: string): void {
    const categoryCommands = Array.from(this.entries.values())
      .filter(e => e.command.startsWith(`ideia:${category}`))
      .map(e => e.command);
    for (const cmd of categoryCommands) {
      this.reset(cmd);
    }
  }

  getConflictsWith(keybinding: string): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const allEntries = this.getAll();
    for (const entry of allEntries) {
      if (entry.keybinding === keybinding) {
        conflicts.push({
          command: entry.command,
          keybinding: entry.keybinding,
          conflictingWith: allEntries
            .filter(e => e.keybinding === keybinding && e.command !== entry.command)
            .map(e => e.command),
        });
      }
    }
    return conflicts;
  }

  getRecommendedKeybindings(profile?: string): Array<{ command: string; keybinding: string }> {
    if (profile === 'vim') return PRESET_SCHEMES['vim-mode'];
    if (profile === 'emacs') return PRESET_SCHEMES['emacs-mode'];
    return PRESET_SCHEMES['default'];
  }

  applyPresetScheme(scheme: PresetScheme): void {
    const bindings = PRESET_SCHEMES[scheme];
    for (const b of bindings) {
      this.set(b.command, b.keybinding);
    }
  }

  exportToJSON(): string {
    return JSON.stringify(this.getAll().map(e => ({
      command: e.command,
      keybinding: e.keybinding,
      default: e.default,
    })), null, 2);
  }

  importFromJSON(json: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;
    try {
      const data: Array<{ command: string; keybinding: string }> = JSON.parse(json);
      for (const item of data) {
        const result = this.set(item.command, item.keybinding);
        if (result.valid) {
          imported++;
        } else {
          errors.push(`Failed to import "${item.command}": ${result.errors.map(e => e.message).join(', ')}`);
        }
      }
    } catch {
      errors.push('Invalid JSON format');
    }
    return { imported, errors };
  }

  private getAllKeybindings(): KeybindingEntry[] {
    return Array.from(this.entries.values());
  }
}
