import { OnboardingWizard } from './onboarding-wizard.js';
import type { WizardSummary, AdaptiveSuggestionsInput, AdaptiveWizardState } from './types.js';
export interface InteractionTrackerLike {
    record(type: string, source: string, metadata?: Record<string, unknown>, context?: Record<string, unknown>): unknown;
    getCount(): number;
    getPhase(): string;
}
export declare class AdaptiveOnboardingWizard extends OnboardingWizard {
    private interactionTracker?;
    private pendingSuggestions;
    private adaptiveContext;
    setInteractionTracker(tracker: InteractionTrackerLike): void;
    injectSuggestions(suggestions: AdaptiveSuggestionsInput[]): void;
    getPendingSuggestions(): AdaptiveSuggestionsInput[];
    setAdaptiveContext(ctx: AdaptiveWizardState): void;
    getAdaptiveContext(): AdaptiveWizardState;
    getAdaptationPhase(interactionCount: number): string;
    complete(): WizardSummary;
}
//# sourceMappingURL=adaptive-wizard.d.ts.map