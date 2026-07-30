import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { Violation, ViolationSeverity, ViolationStats } from './types';
export class ViolationRegistry {
  private violations: Violation[] = []; private maxHistory = 10000;
  private activeViolations: Set<string> = new Set();
  record(module: string, type: string, severity: ViolationSeverity, message: string, details?: string, operation?: string, scope?: string): Violation {
    const v: Violation = { id: randomUUID(), timestamp: new Date().toISOString(), module, type, severity, message, details, operation, scope };
    this.violations.push(v); if (this.violations.length > this.maxHistory) this.violations.shift();
    if (severity === 'error' || severity === 'critical') this.activeViolations.add(v.id);
    return v;
  }
  resolve(id: string): boolean { return this.activeViolations.delete(id); }
  list(module?: string, severity?: ViolationSeverity): Violation[] {
    let r = [...this.violations];
    if (module) r = r.filter(v => v.module === module);
    if (severity) r = r.filter(v => v.severity === severity);
    return r.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  query(options?: { module?: string; severity?: ViolationSeverity; scope?: string; fromTime?: string; toTime?: string; type?: string }): Violation[] {
    let r = [...this.violations];
    if (options?.module) r = r.filter(v => v.module === options.module);
    if (options?.severity) r = r.filter(v => v.severity === options.severity);
    if (options?.scope) r = r.filter(v => v.scope === options.scope);
    if (options?.type) r = r.filter(v => v.type === options.type);
    if (options?.fromTime) r = r.filter(v => new Date(v.timestamp) >= new Date(options.fromTime ?? ''));
    if (options?.toTime) r = r.filter(v => new Date(v.timestamp) <= new Date(options.toTime ?? ''));
    return r.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  exportReport(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const header = 'id,timestamp,module,type,severity,message,details,operation,scope';
      const rows = this.violations.map(v =>
        `${v.id},${v.timestamp},${v.module},${v.type},${v.severity},"${(v.message || '').replace(/"/g, '""')}","${(v.details || '').replace(/"/g, '""')}",${v.operation || ''},${v.scope || ''}`
      );
      return [header, ...rows].join('\n');
    }
    return JSON.stringify(this.violations, null, 2);
  }
  getStats(): ViolationStats {
    const byModule: Record<string,number> = {}; const byType: Record<string,number> = {}; const bySeverity: Record<string,number> = {};
    for (const v of this.violations) {
      byModule[v.module] = (byModule[v.module] || 0) + 1;
      byType[v.type] = (byType[v.type] || 0) + 1;
      bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
    }
    return { total: this.violations.length, byModule, byType, bySeverity, open: this.activeViolations.size, resolved: this.violations.length - this.activeViolations.size };
  }
  hasActiveViolations(module?: string): boolean {
    if (!module) return this.activeViolations.size > 0;
    return this.violations.some(v => v.module === module && this.activeViolations.has(v.id));
  }
  explain(id: string): Violation | undefined { return this.violations.find(v => v.id === id); }
  clear(): void { this.violations = []; this.activeViolations.clear(); }
}
export function createViolationRegistry(): ViolationRegistry { return new ViolationRegistry(); }
