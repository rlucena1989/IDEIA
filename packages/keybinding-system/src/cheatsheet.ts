import { Keybinding, KeybindingRegistry } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cheatsheet');

export interface CheatsheetCategory {
  name: string;
  description: string;
  keybindings: Keybinding[];
}

export interface CheatsheetOptions {
  includeChord?: boolean;
  format?: 'text' | 'html';
}

const DEFAULT_CATEGORIES: Record<string, { description: string; commands: string[] }> = {
  general: {
    description: 'Comandos gerais',
    commands: ['ideia:focus.dashboard', 'ideia:focus.chat', 'ideia:focus.search', 'ideia:focus.studies'],
  },
  navigation: {
    description: 'Navegação',
    commands: ['ideia:navigate.next', 'ideia:navigate.prev', 'ideia:navigate.open', 'ideia:navigate.close'],
  },
  editing: {
    description: 'Edição',
    commands: ['ideia:edit.save', 'ideia:edit.undo', 'ideia:edit.redo', 'ideia:edit.format'],
  },
  agents: {
    description: 'Agentes',
    commands: ['ideia:agent.run', 'ideia:agent.stop', 'ideia:agent.status', 'ideia:agent.logs'],
  },
  workflow: {
    description: 'Workflow',
    commands: ['ideia:workflow.start', 'ideia:workflow.pause', 'ideia:workflow.resume', 'ideia:workflow.cancel'],
  },
  debug: {
    description: 'Debug',
    commands: ['ideia:debug.toggle', 'ideia:debug.step', 'ideia:debug.continue', 'ideia:debug.breakpoint'],
  },
};

export class Cheatsheet {
  private registry: KeybindingRegistry;
  private categories: Record<string, { description: string; commands: string[] }>;
  private discoverIndex = 0;

  constructor(
    registry: KeybindingRegistry,
    categories?: Record<string, { description: string; commands: string[] }>,
  ) {
    this.registry = registry;
    this.categories = categories ?? DEFAULT_CATEGORIES;
  }

  discover(): { key: string; command: string; description: string } | undefined {
    const all = (this.registry as any).getAllKeybindings();
    if (all.length === 0) return undefined;
    const kb = all[this.discoverIndex % all.length];
    this.discoverIndex++;
    const catName = this.findCategoryForCommand(kb.command);
    const desc = catName ? this.categories[catName]?.description ?? 'No description' : 'No description';
    return { key: this.formatKey(kb.key), command: kb.command, description: desc };
  }

  getAllByCategory(): Record<string, Array<{ key: string; command: string }>> {
    const all = (this.registry as any).getAllKeybindings();
    const grouped = this.groupByCategory(all);
    const result: Record<string, Array<{ key: string; command: string }>> = {};
    for (const [cat, kbs] of Object.entries(grouped)) {
      result[cat] = kbs.map(kb => ({ key: this.formatKey(kb.key), command: kb.command }));
    }
    return result;
  }

  getShortcutForCommand(command: string): string | undefined {
    const kbs = this.registry.getKeybindingsForCommand(command);
    if (kbs.length === 0) return undefined;
    return this.formatKey(kbs[0].key);
  }

  getSimilarShortcuts(key: string): Keybinding[] {
    const normalized = key.toLowerCase().trim();
    return (this.registry as any).getAllKeybindings().filter((kb: any) => {
      const kbKey = kb.key.toLowerCase();
      return kbKey.includes(normalized) || normalized.includes(kbKey);
    });
  }

  generate(options?: CheatsheetOptions): string {
    const format = options?.format ?? 'text';
    const all = (this.registry as any).getAllKeybindings();
    const byCategory = this.groupByCategory(all);

    if (format === 'html') {
      return this.toHtml(byCategory, options);
    }
    return this.toText(byCategory);
  }

  filterByCategory(category: string): string {
    const cat = this.categories[category];
    if (!cat) return `Categoria "${category}" não encontrada.`;

    const all = (this.registry as any).getAllKeybindings();
    const filtered = all.filter((kb: any) => cat.commands.includes(kb.command));

    const lines: string[] = [`[${category.toUpperCase()}] ${cat.description}`];
    for (const kb of filtered) {
      lines.push(`  ${this.formatKey(kb.key)}  →  ${kb.command}`);
    }
    return lines.join('\n');
  }

  search(query: string): Keybinding[] {
    const q = query.toLowerCase();
    return (this.registry as any).getAllKeybindings().filter((kb: any) =>
      kb.command.toLowerCase().includes(q) ||
      kb.key.toLowerCase().includes(q),
    );
  }

  private groupByCategory(keybindings: Keybinding[]): Record<string, Keybinding[]> {
    const result: Record<string, Keybinding[]> = { uncategorized: [] };

    for (const [catName, catInfo] of Object.entries(this.categories)) {
      const matched = keybindings.filter((kb: any) => catInfo.commands.includes(kb.command));
      if (matched.length > 0) {
        result[catName] = matched;
      }
    }

    const categorizedCommands = new Set(
      Object.values(this.categories).flatMap(c => c.commands),
    );
    result.uncategorized = keybindings.filter((kb: any) => !categorizedCommands.has(kb.command));

    return result;
  }

  private formatKey(key: string): string {
    return key
      .replace(/ctrl\+/gi, 'Ctrl+')
      .replace(/shift\+/gi, 'Shift+')
      .replace(/alt\+/gi, 'Alt+')
      .replace(/meta\+/gi, 'Cmd+');
  }

  private toText(groups: Record<string, Keybinding[]>): string {
    const lines: string[] = ['=== IDEIA Keyboard Shortcuts ===\n'];
    for (const [cat, kbs] of Object.entries(groups)) {
      if (kbs.length === 0) continue;
      const catInfo = this.categories[cat];
      const heading = catInfo ? catInfo.description : cat;
      lines.push(`[${heading}]`);
      for (const kb of kbs) {
        const when = kb.when ? ` (${kb.when})` : '';
        lines.push(`  ${this.formatKey(kb.key).padEnd(24)} ${kb.command}${when}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  private findCategoryForCommand(command: string): string | undefined {
    for (const [catName, catInfo] of Object.entries(this.categories)) {
      if (catInfo.commands.includes(command)) return catName;
    }
    return undefined;
  }

  printable(): string {
    return this.toText(this.groupByCategory((this.registry as any).getAllKeybindings()));
  }

  getCategoryDescription(category: string): string {
    return this.categories[category]?.description ?? 'Unknown category';
  }

  private toHtml(groups: Record<string, Keybinding[]>, options?: CheatsheetOptions): string {
    const parts: string[] = ['<div class="ideia-cheatsheet">'];
    parts.push('<div class="cheatsheet-hint" style="padding:8px;background:#2d2d2d;border-radius:4px;margin-bottom:12px;font-size:12px;color:#888;">Type a key to search shortcuts</div>');
    for (const [cat, kbs] of Object.entries(groups)) {
      if (kbs.length === 0) continue;
      const catInfo = this.categories[cat];
      const heading = catInfo ? catInfo.description : cat;
      parts.push(`<h3 data-category="${cat}">${heading}</h3>`);
      parts.push('<table><thead><tr><th>Key</th><th>Command</th></tr></thead><tbody>');
      for (const kb of kbs) {
        const whenAttr = kb.when ? ` data-when="${kb.when}"` : '';
        parts.push(`<tr data-command="${kb.command}"${whenAttr}><td><kbd>${this.formatKey(kb.key)}</kbd></td><td>${kb.command}</td></tr>`);
      }
      parts.push('</tbody></table>');
    }
    parts.push('</div>');
    return parts.join('\n');
  }
}
