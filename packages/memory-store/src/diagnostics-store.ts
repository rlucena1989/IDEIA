import { createLogger } from '@ideia/logger';
import { EventBus } from '@ideia/event-bus';
const logger = createLogger('memory-store');

export type DiagnosticSeverity = 'error' | 'warning' | 'information' | 'hint';

export interface Diagnostic {
  filePath: string;
  line: number;
  column: number;
  message: string;
  severity: DiagnosticSeverity;
  source?: string;
  code?: string;
  timestamp: string;
}

export interface FileDiagnostics {
  filePath: string;
  diagnostics: Diagnostic[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  hintCount: number;
  lastUpdated: string;
}

export class DiagnosticsStore {
  private diagnosticsByFile: Map<string, Diagnostic[]> = new Map();
  private _eventBus?: EventBus;

  constructor(eventBus?: EventBus) {
    this._eventBus = eventBus;
  }

  get eventBus(): EventBus | undefined {
    return this._eventBus;
  }

  set eventBus(bus: EventBus | undefined) {
    this._eventBus = bus;
  }

  setDiagnostics(filePath: string, diagnostics: Diagnostic[]): void {
    const normalized = filePath.replace(/\\/g, '/');
    this.diagnosticsByFile.set(normalized, diagnostics);
    if (this._eventBus) {
      this._eventBus.emit({
        type: 'lsp.diagnostics.updated',
        source: 'diagnostics-store',
        payload: { filePath: normalized, count: diagnostics.length },
        metadata: { timestamp: new Date().toISOString() },
      }).catch((_err: any) => logger.error('Error in setDiagnostics emit', { error: String(_err) }));
    }
  }

  appendDiagnostic(diagnostic: Diagnostic): void {
    const normalized = diagnostic.filePath.replace(/\\/g, '/');
    const existing = this.diagnosticsByFile.get(normalized) ?? [];
    existing.push({ ...diagnostic, filePath: normalized });
    this.diagnosticsByFile.set(normalized, existing);
  }

  getDiagnostics(filePath: string): Diagnostic[] {
    const normalized = filePath.replace(/\\/g, '/');
    return [...(this.diagnosticsByFile.get(normalized) ?? [])];
  }

  getFileSummary(filePath: string): FileDiagnostics | null {
    const normalized = filePath.replace(/\\/g, '/');
    const diags = this.diagnosticsByFile.get(normalized);
    if (!diags || diags.length === 0) return null;
    return this.summarize(normalized, diags);
  }

  getGroupedBySeverity(severity: DiagnosticSeverity): Map<string, Diagnostic[]> {
    const result = new Map<string, Diagnostic[]>();
    for (const [file, diags] of this.diagnosticsByFile.entries()) {
      const filtered = diags.filter(d => d.severity === severity);
      if (filtered.length > 0) {
        result.set(file, filtered);
      }
    }
    return result;
  }

  getAllSummaries(): FileDiagnostics[] {
    const result: FileDiagnostics[] = [];
    for (const [file, diags] of this.diagnosticsByFile.entries()) {
      if (diags.length > 0) {
        result.push(this.summarize(file, diags));
      }
    }
    return result.sort((a, b) => b.errorCount - a.errorCount);
  }

  getErrorSummary(): { totalErrors: number; totalWarnings: number; totalInfos: number; totalHints: number; filesWithIssues: number } {
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalInfos = 0;
    let totalHints = 0;
    let filesWithIssues = 0;
    for (const diags of this.diagnosticsByFile.values()) {
      if (diags.length > 0) filesWithIssues++;
      for (const d of diags) {
        switch (d.severity) {
          case 'error': totalErrors++; break;
          case 'warning': totalWarnings++; break;
          case 'information': totalInfos++; break;
          case 'hint': totalHints++; break;
        }
      }
    }
    return { totalErrors, totalWarnings, totalInfos, totalHints, filesWithIssues };
  }

  clear(): void {
    this.diagnosticsByFile.clear();
  }

  clearFile(filePath: string): void {
    const normalized = filePath.replace(/\\/g, '/');
    this.diagnosticsByFile.delete(normalized);
  }

  get count(): number {
    let total = 0;
    for (const diags of this.diagnosticsByFile.values()) {
      total += diags.length;
    }
    return total;
  }

  get files(): string[] {
    return Array.from(this.diagnosticsByFile.keys());
  }

  private summarize(filePath: string, diagnostics: Diagnostic[]): FileDiagnostics {
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let hintCount = 0;
    const sorted = [...diagnostics].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    for (const d of diagnostics) {
      switch (d.severity) {
        case 'error': errorCount++; break;
        case 'warning': warningCount++; break;
        case 'information': infoCount++; break;
        case 'hint': hintCount++; break;
      }
    }
    return {
      filePath,
      diagnostics: sorted,
      errorCount,
      warningCount,
      infoCount,
      hintCount,
      lastUpdated: sorted.length > 0 ? sorted[sorted.length - 1].timestamp : new Date().toISOString(),
    };
  }
}

export function createDiagnosticsStore(eventBus?: EventBus): DiagnosticsStore {
  return new DiagnosticsStore(eventBus);
}
