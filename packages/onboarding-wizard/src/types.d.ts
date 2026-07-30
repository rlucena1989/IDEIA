export type WizardMode = 'quick' | 'expert';
export type ProfileType = 'solo-dev' | 'tech-lead' | 'automator' | 'enterprise' | 'custom';
export type AutonomyLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4';
export interface ProfileOption {
    id: ProfileType;
    label: string;
    description: string;
    icon: string;
    tooltip: string;
    recommendedFor: string;
}
export interface WizardStep {
    id: string;
    title: string;
    description: string;
    required: boolean;
    expertOnly: boolean;
    fields: WizardField[];
}
export interface WizardField {
    id: string;
    label: string;
    type: 'text' | 'select' | 'multiselect' | 'toggle' | 'number' | 'slider';
    required: boolean;
    options?: {
        value: string;
        label: string;
    }[];
    placeholder?: string;
    defaultValue?: string | number | boolean | string[];
}
export interface WizardAnswer {
    stepId: string;
    answers: Record<string, string | number | boolean | string[]>;
}
export interface WizardState {
    mode: WizardMode;
    currentStep: number;
    profile: ProfileType | null;
    autonomyLevel: AutonomyLevel | null;
    answers: Map<string, Record<string, string | number | boolean | string[]>>;
    started: boolean;
    completed: boolean;
    startedAt: number;
    completedAt: number | null;
}
export interface WizardSummary {
    profile: ProfileType;
    profileLabel: string;
    autonomyLevel: AutonomyLevel;
    totalSteps: number;
    completedSteps: number;
    mode: WizardMode;
    config: Record<string, unknown>;
    duration: number;
    adaptationPhase?: string;
    pendingSuggestions?: number;
    interactionCount?: number;
}
export declare const PROFILES: ProfileOption[];
export declare const AUTONOMY_OPTIONS: {
    value: AutonomyLevel;
    label: string;
    description: string;
}[];
export interface CoachmarkProgress {
    completed: number;
    total: number;
    percent: number;
    byFeature: Record<string, {
        completed: number;
        total: number;
    }>;
}
export interface ScheduledCoachmark {
    feature: string;
    triggerOn: 'dashboard' | 'chat' | 'config' | 'command' | 'time';
    delayMs: number;
    completed: boolean;
}
export interface AdaptiveSuggestionsInput {
    stepId: string;
    suggestion: string;
    confidence: number;
    source: 'interaction' | 'pattern' | 'heuristic';
}
export interface AdaptiveWizardState {
    pendingSuggestions: number;
    interactionCount: number;
    adaptationPhase: 'observation' | 'suggestion' | 'automation';
}
//# sourceMappingURL=types.d.ts.map