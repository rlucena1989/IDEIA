"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoachmarkTrigger = void 0;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('coachmark-trigger');
class CoachmarkTrigger {
    coachmarkManager;
    triggered = new Set();
    dismissedCount = 0;
    timers = new Map();
    constructor(coachmarkManager) {
        this.coachmarkManager = coachmarkManager;
    }
    onFirstCommand(command) {
        const key = `command:${command}`;
        if (this.triggered.has(key))
            return;
        if (this.coachmarkManager.isCompleted(key))
            return;
        this.triggered.add(key);
        this.coachmarkManager.show({
            id: key,
            target: '#command-palette',
            title: 'Command Execution',
            description: `You just ran "${command}". You can also use Ctrl+Shift+P to access all commands.`,
            placement: 'bottom',
            feature: 'commands',
        });
    }
    onFirstDashboard() {
        const key = 'feature:dashboard';
        if (this.triggered.has(key))
            return;
        if (this.coachmarkManager.isCompleted(key))
            return;
        this.triggered.add(key);
        this.coachmarkManager.show({
            id: key,
            target: '#ideia-dashboard',
            title: 'IDEIA Dashboard',
            description: 'This dashboard shows your project status, recent activity, and key metrics at a glance.',
            placement: 'right',
            feature: 'dashboard',
        });
    }
    onFirstConfig() {
        const key = 'feature:config';
        if (this.triggered.has(key))
            return;
        if (this.coachmarkManager.isCompleted(key))
            return;
        this.triggered.add(key);
        this.coachmarkManager.show({
            id: key,
            target: '#ideia-settings',
            title: 'Configuration Settings',
            description: 'Customize IDEIA behavior including autonomy level, LLM provider, and workspace preferences.',
            placement: 'left',
            feature: 'config',
        });
    }
    onFirstChat() {
        const key = 'feature:chat';
        if (this.triggered.has(key))
            return;
        if (this.coachmarkManager.isCompleted(key))
            return;
        this.triggered.add(key);
        this.coachmarkManager.show({
            id: key,
            target: '#ideia-chat',
            title: 'IDEIA Chat',
            description: 'Describe what you want to build and IDEIA will architect, implement, and verify it for you.',
            placement: 'top',
            feature: 'chat',
        });
    }
    onFeatureUsed(feature) {
        const key = `feature:${feature}`;
        if (this.triggered.has(key))
            return;
        if (this.coachmarkManager.isCompleted(key))
            return;
        this.triggered.add(key);
        this.coachmarkManager.show({
            id: key,
            target: `#${feature}`,
            title: `Feature: ${feature}`,
            description: `You just used "${feature}". Explore more features to get the most out of IDEIA.`,
            placement: 'bottom',
            feature,
        });
    }
    onTimeBased(feature, delayMs) {
        const key = `time:${feature}`;
        if (this.triggered.has(key))
            return;
        if (this.coachmarkManager.isCompleted(key))
            return;
        const timer = setTimeout(() => {
            this.triggered.add(key);
            this.coachmarkManager.show({
                id: key,
                target: `#${feature}`,
                title: `Tip: ${feature}`,
                description: `Time to explore "${feature}"! Check it out when you have a moment.`,
                placement: 'bottom',
                feature,
            });
            this.timers.delete(key);
        }, delayMs);
        this.timers.set(key, timer);
    }
    getTriggeredFeatures() {
        return Array.from(this.triggered);
    }
    getStats() {
        const all = this.coachmarkManager.getAll();
        return {
            totalTriggered: this.triggered.size,
            features: Array.from(this.triggered),
            dismissed: this.dismissedCount,
            completed: all.filter(c => c.completed).length,
        };
    }
    reset() {
        for (const [, timer] of this.timers) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.triggered.clear();
        this.dismissedCount = 0;
    }
}
exports.CoachmarkTrigger = CoachmarkTrigger;
//# sourceMappingURL=coachmark-trigger.js.map