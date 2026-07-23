import * as crypto from 'crypto'; import * as fs from 'fs'; import * as path from 'path';
import { ContextSource, ContextValidation, TrustReport } from './types';
export class TrustedContext {
  private sources: ContextSource[] = [];
  register(name: string, filePath: string): ContextSource {
    const fullPath = path.resolve(filePath);
    let hash = '', lastUpdated = '', size = 0;
    try {
      const stat = fs.statSync(fullPath);
      hash = this.hashFile(fullPath);
      lastUpdated = stat.mtime.toISOString();
      size = stat.size;
    } catch { /* file may not exist yet */ }
    const source: ContextSource = { name, path: fullPath, lastUpdated, hash, size };
    this.sources.push(source); return source;
  }
  validate(maxAgeHours = 24): TrustReport {
    const validations = this.sources.map(s => {
      let stat: fs.Stats | undefined;
      try { stat = fs.statSync(s.path); } catch { /* file not found */ }
      if (!stat) return { source: s.name, valid: false, age: Infinity, rawAge: Infinity, hashMatch: false, issues: ['File not found'] };
      const age = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60);
      const currentHash = this.hashFile(s.path);
      const hashMatch = currentHash === s.hash;
      const issues: string[] = [];
      if (age >= maxAgeHours) issues.push(`Stale: ${Math.round(age)}h old (max ${maxAgeHours}h)`);
      if (!hashMatch && s.hash) issues.push('Content changed since registration');
      return { source: s.name, valid: issues.length === 0, age, rawAge: age, hashMatch, issues };
    });
    const valid = validations.filter(v => v.valid).length;
    const stale = validations.filter(v => v.rawAge !== undefined && v.rawAge > maxAgeHours).length;
    return { total: validations.length, valid, invalid: validations.length - valid, stale, validations, score: Math.round(valid / validations.length * 100) };
  }
  refresh(): void {
    this.sources = this.sources.map(s => {
      try {
        const stat = fs.statSync(s.path);
        return { ...s, lastUpdated: stat.mtime.toISOString(), hash: this.hashFile(s.path), size: stat.size };
      } catch { return s; }
    });
  }
  private hashFile(filePath: string): string {
    try { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
    catch { return ''; }
  }
}
export function createTrustedContext(): TrustedContext { return new TrustedContext(); }
