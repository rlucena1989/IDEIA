"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeybindingCustomizer = void 0;
const keybinding_validator_1 = require("./keybinding-validator");
const logger_1 = require("@ideia/logger");
const registry_1 = require("./registry");
const logger = (0, logger_1.createLogger)('keybinding-customizer');
const PRESET_SCHEMES = {
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
class KeybindingCustomizer {
    entries = new Map();
    defaults = new Map();
    validator = new keybinding_validator_1.KeybindingValidator();
    registry;
    constructor(registry) {
        this.registry = registry ?? new registry_1.DefaultKeybindingRegistry();
    }
    set(command, keybinding) {
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
        }
        else {
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
    reset(command) {
        const defaultKb = this.defaults.get(command);
        if (!defaultKb)
            return false;
        this.entries.set(command, {
            command,
            keybinding: defaultKb,
            default: defaultKb,
        });
        return true;
    }
    getAll() {
        return Array.from(this.entries.values());
    }
    getConflicts() {
        const conflicts = [];
        const entries = this.getAll();
        for (let i = 0; i < entries.length; i++) {
            const conflictingWith = [];
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
    import(json) {
        const errors = [];
        let imported = 0;
        try {
            const data = JSON.parse(json);
            for (const item of data) {
                const result = this.set(item.command, item.keybinding);
                if (result.valid) {
                    imported++;
                }
                else {
                    errors.push(`Failed to import "${item.command}": ${result.errors.map(e => e.message).join(', ')}`);
                }
            }
        }
        catch {
            errors.push('Invalid JSON format');
        }
        return { imported, errors };
    }
    export() {
        const data = this.getAll().map(e => ({
            command: e.command,
            keybinding: e.keybinding,
        }));
        return JSON.stringify(data, null, 2);
    }
    registerDefaults(defaults) {
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
    getCustomizations() {
        return this.getAll().filter(e => e.keybinding !== e.default);
    }
    resetAll() {
        for (const [command, defaultKb] of this.defaults) {
            this.entries.set(command, {
                command,
                keybinding: defaultKb,
                default: defaultKb,
            });
        }
    }
    resetCategory(category) {
        const categoryCommands = Array.from(this.entries.values())
            .filter(e => e.command.startsWith(`ideia:${category}`))
            .map(e => e.command);
        for (const cmd of categoryCommands) {
            this.reset(cmd);
        }
    }
    getConflictsWith(keybinding) {
        const conflicts = [];
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
    getRecommendedKeybindings(profile) {
        if (profile === 'vim')
            return PRESET_SCHEMES['vim-mode'];
        if (profile === 'emacs')
            return PRESET_SCHEMES['emacs-mode'];
        return PRESET_SCHEMES['default'];
    }
    applyPresetScheme(scheme) {
        const bindings = PRESET_SCHEMES[scheme];
        for (const b of bindings) {
            this.set(b.command, b.keybinding);
        }
    }
    exportToJSON() {
        return JSON.stringify(this.getAll().map(e => ({
            command: e.command,
            keybinding: e.keybinding,
            default: e.default,
        })), null, 2);
    }
    importFromJSON(json) {
        const errors = [];
        let imported = 0;
        try {
            const data = JSON.parse(json);
            for (const item of data) {
                const result = this.set(item.command, item.keybinding);
                if (result.valid) {
                    imported++;
                }
                else {
                    errors.push(`Failed to import "${item.command}": ${result.errors.map(e => e.message).join(', ')}`);
                }
            }
        }
        catch {
            errors.push('Invalid JSON format');
        }
        return { imported, errors };
    }
    getAllKeybindings() {
        return Array.from(this.entries.values());
    }
}
exports.KeybindingCustomizer = KeybindingCustomizer;
//# sourceMappingURL=keybinding-customizer.js.map