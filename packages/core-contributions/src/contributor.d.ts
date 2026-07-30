import { Disposable } from './types';
export interface Contributor<T> {
    contribute(registry: T): void;
}
export interface ContributionRegistry {
    register<T>(type: string, contribution: T): Disposable;
    getContributions<T>(type: string): T[];
    hasType(type: string): boolean;
    dispose(): void;
}
export declare class DefaultContributionRegistry implements ContributionRegistry {
    private contributions;
    private disposables;
    register<T>(type: string, contribution: T): Disposable;
    getContributions<T>(type: string): T[];
    hasType(type: string): boolean;
    dispose(): void;
    private unregister;
}
//# sourceMappingURL=contributor.d.ts.map