import { AdaptiveOnboardingWizard, type InteractionTrackerLike } from './adaptive-wizard.js';
import type { WizardSummary, WizardStep } from './types.js';
export interface ProfilesLike {
    apply(profileId: string): Promise<{
        id: string;
        name: string;
    }>;
    get(id: string): {
        id: string;
        name: string;
    };
    list(): Array<{
        id: string;
        name: string;
    }>;
}
export interface ConfigEngineLike {
    set(path: string, value: unknown): Promise<void>;
}
export interface AdaptiveSystemLike {
    getSuggestions(): Array<{
        id: string;
        title: string;
        description: string;
        type: string;
        confidence: number;
        suggestedValue: string;
        currentValue: string;
        reason: string;
    }> | Promise<Array<{
        id: string;
        title: string;
        description: string;
        type: string;
        confidence: number;
        suggestedValue: string;
        currentValue: string;
        reason: string;
    }>>;
}
export interface WizardIntegrationOptions {
    tracker?: InteractionTrackerLike;
    suggestions?: AdaptiveSystemLike;
    autoAdapt?: {
        getPhase(): string;
        evaluate(suggestions: unknown[]): {
            apply: unknown[];
            skip: unknown[];
        };
        execute(suggestions: unknown[]): Promise<{
            applied: unknown[];
            skipped: unknown[];
            phase: string;
            summary: string;
        }>;
    };
    profiles?: ProfilesLike;
    configEngine?: ConfigEngineLike;
}
export declare class WizardIntegration {
    private tracker?;
    private suggestions?;
    private autoAdapt?;
    private profiles?;
    private configEngine?;
    constructor(options?: WizardIntegrationOptions);
    getDefaultStep(wizard: AdaptiveOnboardingWizard, mode: 'quick' | 'expert'): WizardStep;
    runFullWizard(mode: 'quick' | 'expert'): Promise<{
        wizard: WizardSummary;
        adaptationForecast: {
            currentPhase: string;
            interactionsToSuggestion: number;
            interactionsToAuto: number;
        };
    }>;
    private buildDefaults;
    private calculatePhase;
}
//# sourceMappingURL=wizard-integration.d.ts.map