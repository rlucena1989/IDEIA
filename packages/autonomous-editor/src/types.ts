export type EditOperation = 'insert'|'replace'|'delete'|'rename';
export type EditSafety = 'safe'|'caution'|'dangerous'|'blocked';
export interface EditRequest { operation: EditOperation; filePath: string; content?: string; oldContent?: string; newContent?: string; line?: number; }
export interface EditResult { applied: boolean; safety: EditSafety; reason: string; diff?: string; backupPath?: string; }
export interface DiffLine { type: 'added'|'removed'|'unchanged'; content: string; lineNumber: number; }
export interface SafetyRule { pattern: RegExp; level: EditSafety; reason: string; }
