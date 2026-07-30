import { describe, it, expect } from '@jest/globals';
import { DiagnosticsStore, createDiagnosticsStore } from '../src/diagnostics-store';
import type { Diagnostic } from '../src/diagnostics-store';

describe('DiagnosticsStore', () => {
  it('should create via factory', () => {
    const store = createDiagnosticsStore();
    expect(store).toBeInstanceOf(DiagnosticsStore);
  });

  it('should store and retrieve diagnostics by file', () => {
    const store = new DiagnosticsStore();
    const diags: Diagnostic[] = [
      { filePath: 'src/main.ts', line: 10, column: 5, message: 'Unused variable', severity: 'warning', source: 'eslint', code: 'no-unused-vars', timestamp: new Date().toISOString() },
      { filePath: 'src/main.ts', line: 20, column: 3, message: 'Missing return type', severity: 'error', source: 'tsc', code: 'TS2366', timestamp: new Date().toISOString() },
    ];
    store.setDiagnostics('src/main.ts', diags);
    const retrieved = store.getDiagnostics('src/main.ts');
    expect(retrieved.length).toBe(2);
  });

  it('should group by severity', () => {
    const store = new DiagnosticsStore();
    store.setDiagnostics('a.ts', [
      { filePath: 'a.ts', line: 1, column: 1, message: 'err', severity: 'error', timestamp: new Date().toISOString() },
      { filePath: 'a.ts', line: 2, column: 1, message: 'warn', severity: 'warning', timestamp: new Date().toISOString() },
    ]);
    store.setDiagnostics('b.ts', [
      { filePath: 'b.ts', line: 1, column: 1, message: 'err2', severity: 'error', timestamp: new Date().toISOString() },
    ]);
    const errors = store.getGroupedBySeverity('error');
    expect(errors.size).toBe(2);
    const warnings = store.getGroupedBySeverity('warning');
    expect(warnings.size).toBe(1);
  });

  it('should provide error summary', () => {
    const store = new DiagnosticsStore();
    store.setDiagnostics('a.ts', [
      { filePath: 'a.ts', line: 1, column: 1, message: 'err', severity: 'error', timestamp: new Date().toISOString() },
      { filePath: 'a.ts', line: 2, column: 1, message: 'warn', severity: 'warning', timestamp: new Date().toISOString() },
    ]);
    store.setDiagnostics('b.ts', [
      { filePath: 'b.ts', line: 1, column: 1, message: 'info', severity: 'information', timestamp: new Date().toISOString() },
    ]);
    const summary = store.getErrorSummary();
    expect(summary.totalErrors).toBe(1);
    expect(summary.totalWarnings).toBe(1);
    expect(summary.totalInfos).toBe(1);
    expect(summary.filesWithIssues).toBe(2);
  });

  it('should clear diagnostics', () => {
    const store = new DiagnosticsStore();
    store.setDiagnostics('a.ts', [{ filePath: 'a.ts', line: 1, column: 1, message: 'err', severity: 'error', timestamp: new Date().toISOString() }]);
    expect(store.count).toBe(1);
    store.clear();
    expect(store.count).toBe(0);
  });

  it('should clear file diagnostics', () => {
    const store = new DiagnosticsStore();
    store.setDiagnostics('a.ts', [{ filePath: 'a.ts', line: 1, column: 1, message: 'err', severity: 'error', timestamp: new Date().toISOString() }]);
    store.setDiagnostics('b.ts', [{ filePath: 'b.ts', line: 1, column: 1, message: 'warn', severity: 'warning', timestamp: new Date().toISOString() }]);
    store.clearFile('a.ts');
    expect(store.files).toEqual(['b.ts']);
  });

  it('should return null for unknown file summary', () => {
    const store = new DiagnosticsStore();
    expect(store.getFileSummary('unknown.ts')).toBeNull();
  });

  it('should append diagnostics', () => {
    const store = new DiagnosticsStore();
    store.appendDiagnostic({ filePath: 'a.ts', line: 1, column: 1, message: 'err', severity: 'error', timestamp: new Date().toISOString() });
    store.appendDiagnostic({ filePath: 'a.ts', line: 2, column: 1, message: 'warn', severity: 'warning', timestamp: new Date().toISOString() });
    expect(store.count).toBe(2);
  });

  it('should return all summaries sorted by error count', () => {
    const store = new DiagnosticsStore();
    store.setDiagnostics('a.ts', [{ filePath: 'a.ts', line: 1, column: 1, message: 'err', severity: 'error', timestamp: new Date().toISOString() }]);
    store.setDiagnostics('b.ts', [
      { filePath: 'b.ts', line: 1, column: 1, message: 'err1', severity: 'error', timestamp: new Date().toISOString() },
      { filePath: 'b.ts', line: 2, column: 1, message: 'err2', severity: 'error', timestamp: new Date().toISOString() },
    ]);
    const summaries = store.getAllSummaries();
    expect(summaries.length).toBe(2);
    expect(summaries[0].errorCount).toBe(2);
    expect(summaries[1].errorCount).toBe(1);
  });
});
