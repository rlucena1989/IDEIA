import { CoachmarkManager, Coachmark } from './coachmark-manager';
import { CoachmarkTrigger } from './coachmark-trigger';
export interface PostOnboardingConfig {
    delayAfterOnboardingMs: number;
    features: Array<{
        id: string;
        title: string;
        description: string;
        target: string;
        placement: Coachmark['placement'];
        triggerOn?: 'dashboard' | 'chat' | 'config' | 'command' | 'time';
        delayMs?: number;
    }>;
}
export declare class PostOnboardingCoachmarks {
    private coachmarkManager;
    private trigger;
    private config;
    private timers;
    constructor(coachmarkManager: CoachmarkManager, trigger: CoachmarkTrigger, config?: Partial<PostOnboardingConfig>);
    start(): void;
    stop(): void;
    private scheduleCoachmark;
    private showIfNotCompleted;
    getSchedule(): Array<{
        feature: string;
        triggerOn: string;
        delayMs: number;
        completed: boolean;
    }>;
    getNextScheduled(): {
        feature: string;
        delayMs: number;
    } | undefined;
    isScheduled(feature: string): boolean;
    reset(): void;
}
//# sourceMappingURL=post-onboarding-coachmarks.d.ts.map