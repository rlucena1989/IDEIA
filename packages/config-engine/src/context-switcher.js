"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextSwitcher = void 0;
exports.createContextSwitcher = createContextSwitcher;
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('config-engine:context-switcher');
class ContextSwitcher {
    currentContext = 'unknown';
    history = [];
    listeners = [];
    autoSwitchEnabled = true;
    getCurrent() {
        return this.currentContext;
    }
    getCurrentContext() {
        return this.currentContext;
    }
    setContext(context, trigger = 'manual') {
        if (context === this.currentContext)
            return;
        const event = {
            from: this.currentContext,
            to: context,
            timestamp: Date.now(),
            trigger,
        };
        this.currentContext = context;
        this.history.push(event);
        if (this.history.length > 100)
            this.history.shift();
        log.info(`Context switched: ${event.from} → ${event.to} (${trigger})`);
        for (const listener of this.listeners)
            listener(event);
    }
    onSwitch(listener) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }
    enableAutoSwitch() { this.autoSwitchEnabled = true; }
    disableAutoSwitch() { this.autoSwitchEnabled = false; }
    isAutoSwitchEnabled() { return this.autoSwitchEnabled; }
    getUserContexts() {
        return ['coding', 'debugging', 'reviewing', 'learning', 'presenting', 'unknown'];
    }
    switchTo(context) {
        this.setContext(context, 'manual');
    }
    autoDetect() {
        const detected = this.detectFromActivity({ commands: process.argv, files: [] });
        if (detected !== this.currentContext && this.autoSwitchEnabled) {
            this.setContext(detected, 'auto-detect');
        }
        return this.currentContext;
    }
    detectFromActivity(activity) {
        const commands = activity.commands ?? [];
        const files = activity.files ?? [];
        if (commands.some(c => c.includes('debug') || c.includes('inspect')))
            return 'debugging';
        if (commands.some(c => c.includes('review') || c.includes('check')))
            return 'reviewing';
        if (commands.some(c => c.includes('learn') || c.includes('doc') || c.includes('help')))
            return 'learning';
        if (commands.some(c => c.includes('present') || c.includes('demo')))
            return 'presenting';
        if (files.some(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.py')))
            return 'coding';
        return this.currentContext;
    }
    autoSwitch(activity) {
        if (!this.autoSwitchEnabled)
            return;
        const detected = this.detectFromActivity(activity);
        if (detected !== this.currentContext) {
            this.setContext(detected, 'auto-detect');
        }
    }
}
exports.ContextSwitcher = ContextSwitcher;
function createContextSwitcher() {
    return new ContextSwitcher();
}
//# sourceMappingURL=context-switcher.js.map