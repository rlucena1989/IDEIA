import { OnboardingWizard } from './onboarding-wizard';
export declare class CliWizard {
    private wizard;
    private rl;
    constructor(wizard: OnboardingWizard);
    start(): Promise<void>;
    renderAutonomyMenu(): string;
    renderProgressBar(): void;
    private renderStep;
    private promptFields;
    private prompt;
}
export declare function createCliWizard(wizard: OnboardingWizard): CliWizard;
//# sourceMappingURL=wizard-cli.d.ts.map