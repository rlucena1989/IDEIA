import { KeybindingRegistry } from './types';
export type UserProfile = 'beginner' | 'intermediate' | 'expert';
export interface Tip {
    id: string;
    message: string;
    context?: string;
    profile: UserProfile[];
    category: string;
}
export declare class TipDisplay {
    private registry;
    private tips;
    private dismissed;
    private profile;
    private tipIndex;
    constructor(registry: KeybindingRegistry, options?: {
        tips?: Tip[];
        profile?: UserProfile;
    });
    showTip(context?: string): Tip | undefined;
    getTipOfTheDay(): Tip;
    getTipForContext(context: string): Tip | undefined;
    getNextTip(): Tip | undefined;
    getRandomTip(): Tip | undefined;
    dismissTip(id: string): void;
    setProfile(profile: UserProfile): void;
    getDismissedTips(): string[];
    resetDismissed(): void;
    getAllTips(): Tip[];
    getTipsByCategory(category: string): Tip[];
    private getTipsForProfile;
}
//# sourceMappingURL=tip-display.d.ts.map