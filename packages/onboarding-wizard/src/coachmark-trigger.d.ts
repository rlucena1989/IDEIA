import { CoachmarkManager } from './coachmark-manager';
export interface CoachmarkTriggerStats {
    totalTriggered: number;
    features: string[];
    dismissed: number;
    completed: number;
}
export declare class CoachmarkTrigger {
    private coachmarkManager;
    private triggered;
    private dismissedCount;
    private timers;
    constructor(coachmarkManager: CoachmarkManager);
    onFirstCommand(command: string): void;
    onFirstDashboard(): void;
    onFirstConfig(): void;
    onFirstChat(): void;
    onFeatureUsed(feature: string): void;
    onTimeBased(feature: string, delayMs: number): void;
    getTriggeredFeatures(): string[];
    getStats(): CoachmarkTriggerStats;
    reset(): void;
}
//# sourceMappingURL=coachmark-trigger.d.ts.map