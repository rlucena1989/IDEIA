import { randomUUID } from 'crypto';
import { Violation, ViolationSeverity, ViolationStats } from './types';
export class ViolationRegistry {
  private violations: Violation[] = []; private maxHistory = 10000;
  private activeViolations: Set<string> = new Set();
  record(module: string, type: string, severity: ViolationSeverity, message: string, details?: string, operation?: string): Violation {
    const v: Violation = { id: randomUUID(), timestamp: new Date().toISOString(), module, type, severity, message, details, operation };
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
