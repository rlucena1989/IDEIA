export interface Prioritizable {
    priority: number;
}
export declare function sortByPriority<T extends Prioritizable>(items: T[]): T[];
export declare function highestPriority<T extends Prioritizable>(items: T[]): T | undefined;
export declare const PRIORITY: {
    readonly LOW: 100;
    readonly NORMAL: 500;
    readonly HIGH: 1000;
    readonly CRITICAL: 2000;
    readonly DEFAULT: 500;
};
//# sourceMappingURL=priority.d.ts.map