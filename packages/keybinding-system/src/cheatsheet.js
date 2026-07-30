"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cheatsheet = void 0;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('cheatsheet');
const DEFAULT_CATEGORIES = {
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
class Cheatsheet {
    registry;
    categories;
    discoverIndex = 0;
    constructor(registry, categories) {
        this.registry = registry;
        this.categories = categories ?? DEFAULT_CATEGORIES;
    }
    discover() {
        const all = this.registry.getAllKeybindings();
        if (all.length === 0)
            return undefined;
        const kb = all[this.discoverIndex % all.length];
        this.discoverIndex++;
        const catName = this.findCategoryForCommand(kb.command);
        const desc = catName ? this.categories[catName]?.description ?? 'No description' : 'No description';
        return { key: this.formatKey(kb.key), command: kb.command, description: desc };
    }
    getAllByCategory() {
        const all = this.registry.getAllKeybindings();
        const grouped = this.groupByCategory(all);
        const result = {};
        for (const [cat, kbs] of Object.entries(grouped)) {
            result[cat] = kbs.map(kb => ({ key: this.formatKey(kb.key), command: kb.command }));
        }
        return result;
    }
    getShortcutForCommand(command) {
        const kbs = this.registry.getKeybindingsForCommand(command);
        if (kbs.length === 0)
            return undefined;
        return this.formatKey(kbs[0].key);
    }
    getSimilarShortcuts(key) {
        const normalized = key.toLowerCase().trim();
        return this.registry.getAllKeybindings().filter((kb) => {
            const kbKey = kb.key.toLowerCase();
            return kbKey.includes(normalized) || normalized.includes(kbKey);
        });
    }
    generate(options) {
        const format = options?.format ?? 'text';
        const all = this.registry.getAllKeybindings();
        const byCategory = this.groupByCategory(all);
        if (format === 'html') {
            return this.toHtml(byCategory, options);
        }
        return this.toText(byCategory);
    }
    filterByCategory(category) {
        const cat = this.categories[category];
        if (!cat)
            return `Categoria "${category}" não encontrada.`;
        const all = this.registry.getAllKeybindings();
        const filtered = all.filter((kb) => cat.commands.includes(kb.command));
        const lines = [`[${category.toUpperCase()}] ${cat.description}`];
        for (const kb of filtered) {
            lines.push(`  ${this.formatKey(kb.key)}  →  ${kb.command}`);
        }
        return lines.join('\n');
    }
    search(query) {
        const q = query.toLowerCase();
        return this.registry.getAllKeybindings().filter((kb) => kb.command.toLowerCase().includes(q) ||
            kb.key.toLowerCase().includes(q));
    }
    groupByCategory(keybindings) {
        const result = { uncategorized: [] };
        for (const [catName, catInfo] of Object.entries(this.categories)) {
            const matched = keybindings.filter((kb) => catInfo.commands.includes(kb.command));
            if (matched.length > 0) {
                result[catName] = matched;
            }
        }
        const categorizedCommands = new Set(Object.values(this.categories).flatMap(c => c.commands));
        result.uncategorized = keybindings.filter((kb) => !categorizedCommands.has(kb.command));
        return result;
    }
    formatKey(key) {
        return key
            .replace(/ctrl\+/gi, 'Ctrl+')
            .replace(/shift\+/gi, 'Shift+')
            .replace(/alt\+/gi, 'Alt+')
            .replace(/meta\+/gi, 'Cmd+');
    }
    toText(groups) {
        const lines = ['=== IDEIA Keyboard Shortcuts ===\n'];
        for (const [cat, kbs] of Object.entries(groups)) {
            if (kbs.length === 0)
                continue;
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
    findCategoryForCommand(command) {
        for (const [catName, catInfo] of Object.entries(this.categories)) {
            if (catInfo.commands.includes(command))
                return catName;
        }
        return undefined;
    }
    printable() {
        return this.toText(this.groupByCategory(this.registry.getAllKeybindings()));
    }
    getCategoryDescription(category) {
        return this.categories[category]?.description ?? 'Unknown category';
    }
    toHtml(groups, options) {
        const parts = ['<div class="ideia-cheatsheet">'];
        parts.push('<div class="cheatsheet-hint" style="padding:8px;background:#2d2d2d;border-radius:4px;margin-bottom:12px;font-size:12px;color:#888;">Type a key to search shortcuts</div>');
        for (const [cat, kbs] of Object.entries(groups)) {
            if (kbs.length === 0)
                continue;
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
exports.Cheatsheet = Cheatsheet;
//# sourceMappingURL=cheatsheet.js.map