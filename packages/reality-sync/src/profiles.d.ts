export type ProfileLevel = 'passive' | 'assisted' | 'autonomous';
export type RiskThreshold = 'low' | 'medium' | 'high';
export interface ProfilePreset {
    name: string;
    label: string;
    description: string;
    level: ProfileLevel;
    riskThreshold: RiskThreshold;
    autoFixCategories: string[];
    confirmBeforeWrite: boolean;
    scanners: Record<string, boolean>;
}
declare const PRESETS: Record<string, ProfilePreset>;
export declare function applyProfile(name: string, workspaceRoot: string): ProfilePreset | null;
export declare function getProfile(name: string): ProfilePreset | undefined;
export declare function listProfiles(): ProfilePreset[];
export declare function customizeProfile(name: string, overrides: Partial<ProfilePreset>): ProfilePreset;
export { PRESETS };
//# sourceMappingURL=profiles.d.ts.map