"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultKeybindingRegistry = void 0;
const core_contributions_1 = require("@ideia/core-contributions");
const logger_1 = require("@ideia/logger");
const when_clause_1 = require("./when-clause");
const logger = (0, logger_1.createLogger)('registry');
const COMMAND_CATEGORIES = {
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
class DefaultKeybindingRegistry {
    keybindings = [];
    disposables = new core_contributions_1.DisposableCollection();
    whenEvaluator = new when_clause_1.WhenClauseEvaluator();
    onChangedEmitter = new core_contributions_1.Emitter();
    get onKeybindingsChanged() {
        return this.onChangedEmitter.event;
    }
    registerKeybinding(keybinding) {
        this.keybindings.push(keybinding);
        this.onChangedEmitter.fire(void 0);
        const d = { dispose: () => this.unregisterKeybinding(keybinding) };
        this.disposables.push(d);
        return d;
    }
    getKeybindingsForCommand(command) {
        return this.keybindings.filter((k) => k.command === command);
    }
    getKeybindingsForKey(key) {
        return this.keybindings.filter((k) => k.key === key);
    }
    resolveKeybinding(key, contextKeys) {
        return this.keybindings
            .filter((k) => k.key === key)
            .filter((k) => {
            if (!k.when)
                return true;
            return this.whenEvaluator.evaluate(k.when, contextKeys);
        })
            .map((k) => ({
            command: k.command,
            key: k.key,
            when: k.when,
            contexts: contextKeys,
        }));
    }
    hasKeybinding(key, contextKeys) {
        return this.resolveKeybinding(key, contextKeys).length > 0;
    }
    getAllKeybindings() {
        return [...this.keybindings];
    }
    unregisterKeybinding(keybinding) {
        this.keybindings = this.keybindings.filter((k) => !(k.command === keybinding.command && k.key === keybinding.key));
        this.onChangedEmitter.fire(void 0);
    }
    getRegisteredCommands() {
        return Array.from(new Set(this.keybindings.map((k) => k.command)));
    }
    getUnassignedCommands() {
        const allCommands = Object.keys(COMMAND_CATEGORIES);
        const registered = new Set(this.getRegisteredCommands());
        return allCommands.filter((cmd) => !registered.has(cmd));
    }
    getCommandMetadata(command) {
        const meta = COMMAND_CATEGORIES[command];
        if (!meta)
            return undefined;
        return { command, name: meta.name, category: meta.category, description: undefined };
    }
    getCommandsByCategory(category) {
        return Object.entries(COMMAND_CATEGORIES)
            .filter(([, v]) => v.category === category)
            .map(([command, v]) => ({ command, ...v }));
    }
}
exports.DefaultKeybindingRegistry = DefaultKeybindingRegistry;
//# sourceMappingURL=registry.js.map