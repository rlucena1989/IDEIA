jest.mock('@ideia/core-contributions', () => {
  class Emitter<T> {
    private listeners: Array<(event: T) => void> = [];
    get event() {
      return (listener: (event: T) => void) => {
        this.listeners.push(listener);
        return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
      };
    }
    fire(event: T): void { this.listeners.forEach(l => l(event)); }
    dispose(): void { this.listeners = []; }
  }
  return { Emitter };
});

import { DefaultProblemManager, diagnosticToProblemNode } from './problem-manager';
import { Diagnostic, MarkerSeverity } from './types';

describe('DefaultProblemManager', () => {
  let manager: DefaultProblemManager;

  beforeEach(() => {
    manager = new DefaultProblemManager();
  });

  it('should set problems and fire onProblemsChanged', () => {
    const changed = jest.fn();
    manager.onProblemsChanged(changed);
    const diag: Diagnostic = { range: { startLine: 1, startColumn: 2, endLine: 3, endColumn: 4 }, severity: MarkerSeverity.Error, message: 'err' };
    manager.setProblems('ts', 'file.ts', [diag]);
    expect(changed).toHaveBeenCalledWith({ owner: 'ts', uri: 'file.ts' });
  });

  it('should return problems filtered by URI', () => {
    const d1: Diagnostic = { range: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 }, severity: MarkerSeverity.Warning, message: 'warn' };
    const d2: Diagnostic = { range: { startLine: 2, startColumn: 0, endLine: 2, endColumn: 1 }, severity: MarkerSeverity.Info, message: 'info' };
    manager.setProblems('ts', 'a.ts', [d1]);
    manager.setProblems('ts', 'b.ts', [d2]);

    expect(manager.getProblems('a.ts')).toHaveLength(1);
    expect(manager.getProblems()).toHaveLength(2);
  });

  it('should return problems grouped by owner', () => {
    const diag: Diagnostic = { range: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 }, severity: MarkerSeverity.Error, message: 'err' };
    manager.setProblems('eslint', 'f.ts', [diag]);
    const byOwner = manager.getProblemsByOwner('eslint');
    expect(byOwner.size).toBe(1);
    expect(byOwner.get('f.ts')).toHaveLength(1);
  });

  it('should clear all problems', () => {
    manager.setProblems('ts', 'f.ts', [{ range: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 }, severity: MarkerSeverity.Error, message: 'err' }]);
    manager.clear();
    expect(manager.getProblems()).toHaveLength(0);
  });
});

describe('diagnosticToProblemNode', () => {
  it('should map a Diagnostic to a ProblemNode', () => {
    const diag: Diagnostic = {
      range: { startLine: 10, startColumn: 5, endLine: 12, endColumn: 3 },
      severity: MarkerSeverity.Error,
      message: 'Unexpected token',
      source: 'ts',
      code: 'TS1001',
    };
    const node = diagnosticToProblemNode(diag, 'src/index.ts', 'typescript');
    expect(node.file).toBe('src/index.ts');
    expect(node.line).toBe(10);
    expect(node.column).toBe(5);
    expect(node.severity).toBe(MarkerSeverity.Error);
    expect(node.message).toBe('Unexpected token');
    expect(node.owner).toBe('typescript');
    expect(node.code).toBe('TS1001');
  });
});
