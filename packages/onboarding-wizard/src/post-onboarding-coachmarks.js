"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostOnboardingCoachmarks = void 0;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('onboarding-wizard:post-onboarding');
const DEFAULT_FEATURES = [
    { id: 'post-shortcuts', title: 'Keyboard Shortcuts', description: 'Press Ctrl+Shift+P to open the command palette with all available shortcuts', target: '#command-palette', placement: 'bottom', triggerOn: 'command', delayMs: 60000 },
    { id: 'post-dashboard', title: 'Performance Dashboard', description: 'Monitor system health, evolution, and suggestions in real-time', target: '#ideia-dashboard', placement: 'left', triggerOn: 'time', delayMs: 120000 },
    { id: 'post-config', title: 'Configuration Profiles', description: 'Switch between preset profiles or create custom configurations', target: '#ideia-settings', placement: 'right', triggerOn: 'config' },
    { id: 'post-chat', title: 'Self-Chat', description: 'Ask questions about IDEIA itself - architecture, capabilities, and status', target: '#ideia-chat', placement: 'top', triggerOn: 'time', delayMs: 180000 },
    { id: 'post-autonomy', title: 'Autonomy Levels', description: 'Control how much autonomy IDEIA has - from fully assisted to autonomous', target: '#autonomy-control', placement: 'bottom', triggerOn: 'dashboard' },
    { id: 'post-radar', title: 'Technology Radar', description: 'Discover new technologies and recommendations for your stack', target: '#tech-radar', placement: 'left', triggerOn: 'time', delayMs: 300000 },
    { id: 'post-evolution', title: 'Autonomous Evolution', description: 'IDEIA continuously scans, analyzes, and optimizes itself', target: '#evolution-panel', placement: 'right', triggerOn: 'dashboard' },
    { id: 'post-shortcuts-discovery', title: 'Shortcut Discovery', description: 'Discover shortcuts as you work — IDEIA highlights relevant keybindings contextually', target: '#shortcut-display', placement: 'bottom', triggerOn: 'time', delayMs: 240000 },
    { id: 'post-config-editor', title: 'Schema-Aware Config Editor', description: 'Edit config JSON with real-time validation, autocomplete, and documentation', target: '#config-editor', placement: 'right', triggerOn: 'config' },
    { id: 'post-terminal-search', title: 'Terminal Scrollback Search', description: 'Press Ctrl+F in terminal to search scrollback with regex support', target: '#terminal-panel', placement: 'top', triggerOn: 'time', delayMs: 360000 },
    { id: 'post-streaming-chat', title: 'Streaming Chat', description: 'Cancel AI responses mid-stream with the X button during generation', target: '#ideia-chat', placement: 'bottom', triggerOn: 'chat' },
    { id: 'post-undo-redo', title: 'Undo/Redo in Editor', description: 'Unlimited undo/redo with configurable stack size (default 100 actions)', target: '#editor-panel', placement: 'left', triggerOn: 'time', delayMs: 420000 },
];
class PostOnboardingCoachmarks {
    coachmarkManager;
    trigger;
    config;
    timers = [];
    constructor(coachmarkManager, trigger, config) {
        this.coachmarkManager = coachmarkManager;
        this.trigger = trigger;
        this.config = {
            delayAfterOnboardingMs: 30000,
            features: DEFAULT_FEATURES,
            ...config,
        };
    }
    start() {
        logger.info('Starting post-onboarding coachmarks');
        setTimeout(() => {
            for (const feature of this.config.features) {
                this.scheduleCoachmark(feature);
            }
        }, this.config.delayAfterOnboardingMs);
    }
    stop() {
        for (const timer of this.timers) {
            clearTimeout(timer);
        }
        this.timers = [];
    }
    scheduleCoachmark(feature) {
        if (this.coachmarkManager.isCompleted(feature.id))
            return;
        const delay = feature.delayMs ?? 0;
        if (feature.triggerOn === 'time') {
            const timer = setTimeout(() => this.showIfNotCompleted(feature), delay);
            this.timers.push(timer);
        }
        else if (feature.triggerOn === 'dashboard') {
            const timer = setTimeout(() => this.showIfNotCompleted(feature), delay);
            this.timers.push(timer);
        }
        else if (feature.triggerOn === 'chat') {
            this.showIfNotCompleted(feature);
        }
        else if (feature.triggerOn === 'config') {
            const timer = setTimeout(() => this.showIfNotCompleted(feature), delay);
            this.timers.push(timer);
        }
        else if (feature.triggerOn === 'command') {
            const timer = setTimeout(() => this.showIfNotCompleted(feature), delay);
            this.timers.push(timer);
        }
    }
    showIfNotCompleted(feature) {
        if (this.coachmarkManager.isCompleted(feature.id))
            return;
        const coachmark = {
            id: feature.id,
            target: feature.target,
            title: feature.title,
            description: feature.description,
            placement: feature.placement,
            feature: 'post-onboarding',
            completed: false,
            createdAt: new Date().toISOString(),
        };
        this.coachmarkManager.show(coachmark);
    }
    getSchedule() {
        return this.config.features.map(f => ({
            feature: f.id,
            triggerOn: f.triggerOn ?? 'time',
            delayMs: f.delayMs ?? 0,
            completed: this.coachmarkManager.isCompleted(f.id),
        }));
    }
    getNextScheduled() {
        const now = Date.now();
        for (const f of this.config.features) {
            if (!this.coachmarkManager.isCompleted(f.id) && f.triggerOn === 'time') {
                return { feature: f.id, delayMs: f.delayMs ?? 0 };
            }
        }
        return undefined;
    }
    isScheduled(feature) {
        return this.config.features.some(f => f.id === feature && !this.coachmarkManager.isCompleted(f.id));
    }
    reset() {
        this.stop();
        for (const _feature of this.config.features) {
            this.coachmarkManager.reset();
        }
    }
}
exports.PostOnboardingCoachmarks = PostOnboardingCoachmarks;
//# sourceMappingURL=post-onboarding-coachmarks.js.map