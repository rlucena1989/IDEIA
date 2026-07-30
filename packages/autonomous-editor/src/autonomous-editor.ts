import * as fs from 'fs'; import * as path from 'path'; import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { diffLines } from 'diff';
import { DiffLine, EditRequest, EditResult, EditSafety, SafetyRule } from './types';
const DEFAULT_BACKUP_DIR = '.ai-devkit/backups';
const SAFETY_RULES: SafetyRule[] = [
  { pattern: /node_modules/, level: 'caution', reason: 'Editing node_modules is unusual' },
  { pattern: /\.env/, level: 'caution', reason: 'Environment file — verify changes' },
  { pattern: /package-lock\.json$/, level: 'caution', reason: 'Lock file — use npm install instead' },
  { pattern: /\.git\//, level: 'blocked', reason: 'Git internals should not be edited directly' },
  { pattern: /secret|password|credential/i, level: 'dangerous', reason: 'Potential secret in file path' },
  { pattern: /\/dist\//, level: 'caution', reason: 'Build output — changes will be overwritten' },
  { pattern: /\.exe$|\.dll$|\.so$/, level: 'blocked', reason: 'Binary files cannot be safely edited' },
];
export class AutonomousEditor {
  private safetyRules: SafetyRule[];
  private backupDir: string;
  constructor(customRules?: SafetyRule[], backupDir?: string) {
    this.safetyRules = [...SAFETY_RULES, ...(customRules||[])];
    this.backupDir = backupDir ?? DEFAULT_BACKUP_DIR;
  }
  edit(request: EditRequest): EditResult {
    const safety = this.assessSafety(request.filePath);
    if (safety === 'blocked') return { applied: false, safety: 'blocked', reason: 'Blocked by safety rule', diff: undefined, backupPath: undefined };
    const fullPath = path.resolve(request.filePath);
    if (!fs.existsSync(fullPath) && request.operation !== 'insert') return { applied: false, safety, reason: `File not found: ${request.filePath}`, diff: undefined, backupPath: undefined };
    const backupPath = this.backup(fullPath);
    try {
      switch (request.operation) {
        case 'insert': return this.handleInsert(fullPath, request, safety, backupPath);
        case 'replace': return this.handleReplace(fullPath, request, safety, backupPath);
        case 'delete': return this.handleDelete(fullPath, request, safety, backupPath);
        case 'rename': return this.handleRename(fullPath, request, safety, backupPath);
        default: return { applied: false, safety, reason: `Unknown operation: ${request.operation}`, diff: undefined, backupPath };
      }
    } catch (e) {
      return { applied: false, safety, reason: `Edit error: ${e}`, diff: undefined, backupPath };
    }
  }
  diff(_filePath: string, originalContent: string, newContent: string): DiffLine[] {
    const result: DiffLine[] = [];
    const changes = diffLines(originalContent, newContent);
    let lineNumber = 1;
    for (const change of changes) {
      const lines = change.value.replace(/\n$/, '').split('\n');
      if (change.added) {
        for (const line of lines) {
          result.push({ type: 'added', content: line, lineNumber });
          lineNumber++;
        }
      } else if (change.removed) {
        for (const line of lines) {
          result.push({ type: 'removed', content: line, lineNumber });
          lineNumber++;
        }
      } else {
        for (const line of lines) {
          result.push({ type: 'unchanged', content: line, lineNumber });
          lineNumber++;
        }
      }
    }
    return result;
  }
  private handleInsert(filePath: string, req: EditRequest, safety: EditSafety, backupPath: string): EditResult {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const line = req.line || 0; const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8').split('\n') : [];
    existing.splice(line, 0, req.content || '');
    fs.writeFileSync(filePath, existing.join('\n'), 'utf-8');
    return { applied: true, safety, reason: 'Content inserted', diff: undefined, backupPath };
  }
  private handleReplace(filePath: string, req: EditRequest, safety: EditSafety, backupPath: string): EditResult {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (req.oldContent && content.includes(req.oldContent)) {
      const newContent = content.replace(req.oldContent, req.newContent || '');
      fs.writeFileSync(filePath, newContent, 'utf-8');
      return { applied: true, safety, reason: 'Content replaced', diff: undefined, backupPath };
    }
    if (req.line !== undefined) {
      const lines = content.split('\n');
      if (req.line >= 0 && req.line < lines.length) {
        lines[req.line] = req.newContent || '';
        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
        return { applied: true, safety, reason: 'Line replaced', diff: undefined, backupPath };
      }
    }
    return { applied: false, safety, reason: 'Could not find content to replace', diff: undefined, backupPath };
  }
  private handleDelete(filePath: string, _req: EditRequest, safety: EditSafety, backupPath: string): EditResult {
    const content = fs.readFileSync(filePath, 'utf-8'); const lines = content.split('\n');
    if (_req.line !== undefined) {
      if (_req.line >= 0 && _req.line < lines.length) { lines.splice(_req.line, 1); fs.writeFileSync(filePath, lines.join('\n'), 'utf-8'); }
      return { applied: true, safety, reason: 'Line deleted', diff: undefined, backupPath };
    }
    return { applied: false, safety, reason: 'Specify line to delete', diff: undefined, backupPath };
  }
  private handleRename(filePath: string, req: EditRequest, safety: EditSafety, backupPath: string): EditResult {
    if (!req.newContent) return { applied: false, safety, reason: 'No target path specified', diff: undefined, backupPath };
    fs.renameSync(filePath, path.resolve(req.newContent));
    return { applied: true, safety, reason: `Renamed to ${req.newContent}`, diff: undefined, backupPath };
  }
  private assessSafety(filePath: string): EditSafety {
    let worst: EditSafety = 'safe';
    for (const rule of this.safetyRules) {
      if (rule.pattern.test(filePath)) {
        if (rule.level === 'blocked') return 'blocked';
        const levels: EditSafety[] = ['safe', 'caution', 'dangerous', 'blocked'];
        if (levels.indexOf(rule.level) > levels.indexOf(worst)) worst = rule.level;
      }
    }
    return worst;
  }
  private backup(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    const dir = path.resolve(this.backupDir); fs.mkdirSync(dir, { recursive: true });
    const backupPath = path.join(dir, `${path.basename(filePath)}.${Date.now()}.bak`);
    fs.copyFileSync(filePath, backupPath); return backupPath;
  }
}
export function createAutonomousEditor(customRules?: SafetyRule[]): AutonomousEditor { return new AutonomousEditor(customRules); }
