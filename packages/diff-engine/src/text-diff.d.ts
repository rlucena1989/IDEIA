export interface TextDiffChunk {
    type: 'add' | 'remove' | 'context';
    content: string;
}
export interface TextDiff {
    file: string;
    linesAdded: number;
    linesRemoved: number;
    chunks: TextDiffChunk[];
}
export declare function diffText(original: string, modified: string, filePath: string): TextDiff;
export declare function diffTexts(files: {
    path: string;
    original: string;
    modified: string;
}[]): {
    diffs: TextDiff[];
    totalFiles: number;
    totalAdded: number;
    totalRemoved: number;
    summary: string;
};
//# sourceMappingURL=text-diff.d.ts.map