import type { ProfileType, AutonomyLevel, WizardSummary } from './types.js';
export interface ConfigPreset {
    autonomyLevel: AutonomyLevel;
    features: Record<string, boolean>;
    security: Record<string, unknown>;
}
export declare class ConfigGenerator {
    generate(answers: Map<string, Record<string, string | number | boolean | string[]>>, profile: ProfileType): string;
    getPreset(profile: ProfileType): ConfigPreset;
    generateFromSummary(summary: WizardSummary): string;
    private buildProjectSection;
}
//# sourceMappingURL=config-generator.d.ts.map