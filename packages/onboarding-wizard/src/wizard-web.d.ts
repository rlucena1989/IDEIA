import { OnboardingWizard } from './onboarding-wizard';
import { WizardState, WizardStep, AutonomyLevel, PROFILES } from './types';
export interface IWebWizardRenderer {
    renderStep(step: WizardStep, state: WizardState): string;
    renderSummary(state: WizardState): string;
    getProgress(state: WizardState): number;
    renderProgressBar(state: WizardState): string;
    renderAutonomyCard(level: AutonomyLevel): string;
    renderProfileCard(profile: (typeof PROFILES)[0]): string;
    generateFullPage(state: WizardState): string;
}
export declare class WebWizardRenderer implements IWebWizardRenderer {
    private wizard;
    constructor(wizard: OnboardingWizard);
    renderStep(step: WizardStep, state: WizardState): string;
    renderSummary(state: WizardState): string;
    getProgress(state: WizardState): number;
    renderProgressBar(state: WizardState): string;
    renderAutonomyCard(level: AutonomyLevel): string;
    renderProfileCard(profile: (typeof PROFILES)[0]): string;
    generateFullPage(state: WizardState): string;
}
export declare function createWebWizardRenderer(wizard: OnboardingWizard): WebWizardRenderer;
//# sourceMappingURL=wizard-web.d.ts.map