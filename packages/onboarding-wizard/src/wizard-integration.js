"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardIntegration = void 0;
const adaptive_wizard_js_1 = require("./adaptive-wizard.js");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('wizard-integration');
class WizardIntegration {
    tracker;
    suggestions;
    autoAdapt;
    profiles;
    configEngine;
    constructor(options = {}) {
        this.tracker = options.tracker;
        this.suggestions = options.suggestions;
        this.autoAdapt = options.autoAdapt;
        this.profiles = options.profiles;
        this.configEngine = options.configEngine;
    }
    getDefaultStep(wizard, mode) {
        return wizard.start(mode);
    }
    async runFullWizard(mode) {
        const wizard = new adaptive_wizard_js_1.AdaptiveOnboardingWizard();
        if (this.tracker) {
            wizard.setInteractionTracker(this.tracker);
        }
        if (this.suggestions) {
            const suggestions = await this.suggestions.getSuggestions();
            if (suggestions.length > 0) {
                wizard.injectSuggestions(suggestions);
            }
        }
        if (mode === 'quick') {
            this.getDefaultStep(wizard, mode);
        }
        else {
            wizard.start(mode);
        }
        let step = wizard.getCurrentStep();
        while (step) {
            let defaults;
            if (mode === 'quick') {
                defaults = this.buildDefaults(step);
            }
            else {
                defaults = this.buildDefaults(step);
            }
            const result = wizard.submitStep({ stepId: step.id, answers: defaults });
            if (result.complete)
                break;
            step = result.next;
        }
        const summary = wizard.complete();
        if (this.tracker) {
            this.tracker.record('wizard.completed', 'wizard-integration', {
                mode,
                profile: summary.profile,
            });
        }
        if (this.profiles && summary.profile) {
            await this.profiles.apply(summary.profile);
        }
        if (this.configEngine) {
            for (const [key, value] of Object.entries(summary.config)) {
                await this.configEngine.set(`wizard.${key}`, value);
            }
            await this.configEngine.set('wizard.profile', summary.profile ?? '');
            await this.configEngine.set('wizard.mode', summary.mode);
            await this.configEngine.set('wizard.autonomyLevel', summary.autonomyLevel);
        }
        const interactionCount = this.tracker?.getCount() ?? 0;
        const currentPhase = summary.adaptationPhase ?? this.calculatePhase(interactionCount);
        const interactionsToSuggestion = Math.max(0, 50 - interactionCount);
        const interactionsToAuto = Math.max(0, 200 - interactionCount);
        return {
            wizard: summary,
            adaptationForecast: {
                currentPhase,
                interactionsToSuggestion,
                interactionsToAuto,
            },
        };
    }
    buildDefaults(step) {
        const answers = {};
        for (const field of step.fields) {
            if (field.defaultValue !== undefined) {
                answers[field.id] = field.defaultValue;
            }
            else if (field.type === 'select' && field.options && field.options.length > 0) {
                answers[field.id] = field.options[0].value;
            }
            else if (field.type === 'multiselect' && field.options) {
                answers[field.id] = [field.options[0].value];
            }
            else if (field.type === 'toggle') {
                answers[field.id] = false;
            }
            else if (field.type === 'number') {
                answers[field.id] = 0;
            }
            else if (field.type === 'slider') {
                answers[field.id] = 0.5;
            }
            else {
                answers[field.id] = '';
            }
        }
        return answers;
    }
    calculatePhase(count) {
        if (count < 50)
            return 'observation';
        if (count < 200)
            return 'suggestion';
        return 'auto';
    }
}
exports.WizardIntegration = WizardIntegration;
//# sourceMappingURL=wizard-integration.js.map