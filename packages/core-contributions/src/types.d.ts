export interface ContributionProvider<T> {
    getContributions(): T[];
    hasContributions(): boolean;
    onContributionsChanged: Event<void>;
}
export interface Contribution<T> {
    id: string;
    label?: string;
    description?: string;
    enabled?: boolean;
}
export interface Disposable {
    dispose(): void;
}
export interface Event<T> {
    (listener: (event: T) => void, thisArgs?: unknown): Disposable;
}
export declare class Emitter<T> {
    private listeners;
    private disposed;
    get event(): Event<T>;
    fire(event: T): void;
    dispose(): void;
    private removeListener;
}
export declare class DisposableCollection implements Disposable {
    private disposables;
    push(disposable: Disposable): void;
    dispose(): void;
}
export declare class DefaultContributionProvider<T extends Contribution<unknown>> implements ContributionProvider<T> {
    private contributions;
    private onChangedEmitter;
    get onContributionsChanged(): Event<void>;
    constructor(contributions?: T[]);
    getContributions(): T[];
    hasContributions(): boolean;
    register(contribution: T): Disposable;
    unregister(id: string): void;
    get(id: string): T | undefined;
}
export declare function bindContributionProvider<T extends Contribution<unknown>>(contributions: DefaultContributionProvider<T>): ContributionProvider<T>;
export declare enum ContributionType {
    Command = "command",
    Menu = "menu",
    Keybinding = "keybinding",
    View = "view",
    Widget = "widget",
    Tool = "tool",
    Agent = "agent",
    Preference = "preference",
    Theme = "theme",
    Custom = "custom"
}
export interface ContributionMetadata {
    type: ContributionType;
    id: string;
    name: string;
    version?: string;
    provider?: string;
    tags?: string[];
}
//# sourceMappingURL=types.d.ts.map