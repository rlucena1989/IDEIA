export interface DiffEntry {
    type: 'breaking' | 'non-breaking';
    path: string;
    field: string;
    change: string;
    oldValue?: unknown;
    newValue?: unknown;
}
export interface DiffResult {
    specType: string;
    breaking: DiffEntry[];
    nonBreaking: DiffEntry[];
    total: number;
}
export declare function deepDiff(oldObj: Record<string, unknown>, newObj: Record<string, unknown>, basePath?: string): DiffEntry[];
export declare function diffSpecs(oldFile: string, newFile: string): DiffResult;
//# sourceMappingURL=object-diff.d.ts.map