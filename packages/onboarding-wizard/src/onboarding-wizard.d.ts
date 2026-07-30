import type { WizardMode, WizardState, WizardAnswer, WizardSummary, WizardStep } from './types.js';
export declare class OnboardingWizard {
    private state;
    private active;
    private autoAdvanceMode;
    constructor();
    start(mode?: WizardMode): WizardStep;
    getSteps(): WizardStep[];
    getState(): WizardState;
    getProgress(): {
        current: number;
        total: number;
        percent: number;
    };
    getCurrentStep(): WizardStep | null;
    submitStep(answers: WizardAnswer): {
        next: WizardStep | null;
        complete: boolean;
    };
    complete(): WizardSummary;
    getSummary(): WizardSummary | null;
    private getFilteredSteps;
    private buildConfig;
    private createInitialState;
    private buildStepDefaults;
}
//# sourceMappingURL=onboarding-wizard.d.ts.map