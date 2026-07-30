"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveOnboardingWizard = void 0;
const onboarding_wizard_js_1 = require("./onboarding-wizard.js");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('adaptive-wizard');
class AdaptiveOnboardingWizard extends onboarding_wizard_js_1.OnboardingWizard {
    interactionTracker;
    pendingSuggestions = [];
    adaptiveContext = { pendingSuggestions: 0, interactionCount: 0, adaptationPhase: 'observation' };
    setInteractionTracker(tracker) {
        this.interactionTracker = tracker;
    }
    injectSuggestions(suggestions) {
        this.pendingSuggestions = [...suggestions];
        this.setAdaptiveContext({
            pendingSuggestions: suggestions.length,
            interactionCount: this.interactionTracker?.getCount() ?? 0,
            adaptationPhase: this.getAdaptationPhase(this.interactionTracker?.getCount() ?? 0),
        });
    }
    getPendingSuggestions() {
        return [...this.pendingSuggestions];
    }
    setAdaptiveContext(ctx) {
        this.adaptiveContext = { ...ctx };
    }
    getAdaptiveContext() {
        return { ...this.adaptiveContext };
    }
    getAdaptationPhase(interactionCount) {
        if (interactionCount < 50)
            return 'observation';
        if (interactionCount < 200)
            return 'suggestion';
        return 'auto';
    }
    complete() {
        const summary = super.complete();
        if (this.interactionTracker) {
            this.interactionTracker.record('profile.applied', 'onboarding-wizard', { mode: summary.mode });
        }
        const interactionCount = this.interactionTracker?.getCount() ?? 0;
        const phase = this.getAdaptationPhase(interactionCount);
        return {
            ...summary,
            adaptationPhase: phase,
            pendingSuggestions: this.pendingSuggestions.length,
            interactionCount,
        };
    }
}
exports.AdaptiveOnboardingWizard = AdaptiveOnboardingWizard;
//# sourceMappingURL=adaptive-wizard.js.map