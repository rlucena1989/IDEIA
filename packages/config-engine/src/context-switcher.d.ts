export type UserContext = 'coding' | 'debugging' | 'reviewing' | 'learning' | 'presenting' | 'unknown';
export interface ContextSwitchEvent {
    from: UserContext;
    to: UserContext;
    timestamp: number;
    trigger: string;
}
export declare class ContextSwitcher {
    private currentContext;
    private history;
    private listeners;
    private autoSwitchEnabled;
    getCurrent(): UserContext;
    getCurrentContext(): UserContext;
    setContext(context: UserContext, trigger?: string): void;
    onSwitch(listener: (event: ContextSwitchEvent) => void): () => void;
    getHistory(limit?: number): ContextSwitchEvent[];
    enableAutoSwitch(): void;
    disableAutoSwitch(): void;
    isAutoSwitchEnabled(): boolean;
    getUserContexts(): UserContext[];
    switchTo(context: UserContext): void;
    autoDetect(): UserContext;
    detectFromActivity(activity: {
        commands?: string[];
        files?: string[];
        time?: Date;
    }): UserContext;
    autoSwitch(activity: {
        commands?: string[];
        files?: string[];
        time?: Date;
    }): void;
}
export declare function createContextSwitcher(): ContextSwitcher;
//# sourceMappingURL=context-switcher.d.ts.map