"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingWizard = void 0;
const steps_js_1 = require("./steps.js");
const types_js_1 = require("./types.js");
class OnboardingWizard {
    state;
    active = false;
    autoAdvanceMode = false;
    constructor() {
        this.state = this.createInitialState();
    }
    start(mode = 'quick') {
        this.active = true;
        this.state = this.createInitialState();
        this.state.mode = mode;
        this.state.started = true;
        this.state.startedAt = Date.now();
        this.autoAdvanceMode = mode === 'quick';
        return this.getFilteredSteps()[0];
    }
    getSteps() {
        return this.getFilteredSteps();
    }
    getState() {
        return { ...this.state, answers: this.state.answers };
    }
    getProgress() {
        const steps = this.getFilteredSteps();
        const total = steps.length;
        const current = Math.min(this.state.currentStep + 1, total);
        return {
            current,
            total,
            percent: total > 0 ? Math.round((current / total) * 100) : 0
        };
    }
    getCurrentStep() {
        if (!this.active)
            return null;
        const steps = this.getFilteredSteps();
        return steps[this.state.currentStep] ?? null;
    }
    submitStep(answers) {
        if (!this.active)
            throw new Error('Wizard not started');
        const steps = this.getFilteredSteps();
        const step = steps[this.state.currentStep];
        if (!step)
            return { next: null, complete: true };
        this.state.answers.set(step.id, answers.answers);
        if (step.id === 'welcome') {
            const profile = answers.answers.profile;
            this.state.profile = profile;
        }
        if (step.id === 'autonomy') {
            this.state.autonomyLevel = answers.answers.level;
        }
        if (this.autoAdvanceMode && step.id !== 'summary') {
            const defaults = this.buildStepDefaults(step);
            for (const [key, value] of Object.entries(defaults)) {
                if (!(key in (answers.answers ?? {}))) {
                    this.state.answers.set(step.id, { ...this.state.answers.get(step.id), [key]: value });
                }
            }
        }
        this.state.currentStep++;
        if (this.state.currentStep >= steps.length) {
            return { next: null, complete: true };
        }
        const nextStep = steps[this.state.currentStep];
        return { next: nextStep, complete: false };
    }
    complete() {
        this.active = false;
        this.state.completed = true;
        this.state.completedAt = Date.now();
        const profile = types_js_1.PROFILES.find(p => p.id === this.state.profile);
        const duration = this.state.completedAt - this.state.startedAt;
        const config = this.buildConfig();
        return {
            profile: this.state.profile,
            profileLabel: profile?.label ?? 'Unknown',
            autonomyLevel: this.state.autonomyLevel,
            totalSteps: this.getFilteredSteps().length,
            completedSteps: this.state.currentStep,
            mode: this.state.mode,
            config,
            duration
        };
    }
    getSummary() {
        if (!this.state.completed)
            return null;
        return this.complete();
    }
    getFilteredSteps() {
        return steps_js_1.WIZARD_STEPS.filter(s => this.state.mode === 'expert' || !s.expertOnly);
    }
    buildConfig() {
        const config = {};
        for (const [stepId, answers] of this.state.answers) {
            for (const [key, value] of Object.entries(answers)) {
                config[`${stepId}.${key}`] = value;
            }
        }
        return config;
    }
    createInitialState() {
        return {
            mode: 'quick',
            currentStep: 0,
            profile: null,
            autonomyLevel: null,
            answers: new Map(),
            started: false,
            completed: false,
            startedAt: 0,
            completedAt: null
        };
    }
    buildStepDefaults(step) {
        const defaults = {};
        for (const field of step.fields) {
            if (field.defaultValue !== undefined) {
                defaults[field.id] = field.defaultValue;
            }
        }
        return defaults;
    }
}
exports.OnboardingWizard = OnboardingWizard;
//# sourceMappingURL=onboarding-wizard.js.map