export interface GitDiffHunk {
    header: string;
    lines: {
        type: 'add' | 'remove' | 'context';
        content: string;
    }[];
}
export interface GitDiffFile {
    file: string;
    status: 'modified' | 'added' | 'deleted' | 'renamed';
    hunks: GitDiffHunk[];
    linesAdded: number;
    linesRemoved: number;
}
export declare function parseGitDiff(raw: string): GitDiffFile[];
export declare function formatGitDiff(files: GitDiffFile[]): string;
export declare function gitDiff(base: string, root: string, file?: string): Promise<GitDiffFile[]>;
export declare function gitLog(limit: number, root: string): Promise<string[]>;
//# sourceMappingURL=git-diff.d.ts.map