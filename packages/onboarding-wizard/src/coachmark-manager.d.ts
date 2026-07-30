export interface Coachmark {
    id: string;
    target: string;
    title: string;
    description: string;
    placement: 'top' | 'bottom' | 'left' | 'right';
    feature: string;
    completed: boolean;
    createdAt: string;
    completedAt?: string;
}
export interface CoachmarkStorage {
    get(key: string): Coachmark | undefined;
    set(key: string, value: Coachmark): void;
    delete(key: string): boolean;
    list(): Coachmark[];
}
export declare class MemoryCoachmarkStorage implements CoachmarkStorage {
    private store;
    get(key: string): Coachmark | undefined;
    set(key: string, value: Coachmark): void;
    delete(key: string): boolean;
    list(): Coachmark[];
}
export declare class CoachmarkManager {
    private storage;
    private coachmarks;
    private onShow?;
    constructor(storage?: CoachmarkStorage);
    setOnShow(callback: (coachmark: Coachmark) => void): void;
    show(coachmark: Omit<Coachmark, 'completed' | 'createdAt'>): void;
    dismiss(id: string): boolean;
    isCompleted(id: string): boolean;
    reset(): void;
    resetFeature(feature: string): void;
    getPending(): Coachmark[];
    getAll(): Coachmark[];
    getById(id: string): Coachmark | undefined;
    getProgress(): {
        completed: number;
        total: number;
        percent: number;
        byFeature: Record<string, {
            completed: number;
            total: number;
        }>;
    };
    getNextPending(): Coachmark | undefined;
    dismissAll(): void;
    getFeatureProgress(feature: string): {
        completed: number;
        total: number;
    };
    isAllCompleted(): boolean;
    private loadFromStorage;
}
//# sourceMappingURL=coachmark-manager.d.ts.map