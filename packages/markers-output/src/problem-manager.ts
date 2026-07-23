import { Emitter } from '@ideia/core-contributions';
import { Diagnostic, MarkerSeverity, ProblemManager, ProblemNode } from './types';

export class DefaultProblemManager implements ProblemManager {
  private problems = new Map<string, Map<string, Diagnostic[]>>();
  private onChangedEmitter = new Emitter<{ owner: string; uri: string }>();

  get onProblemsChanged() { return this.onChangedEmitter.event; }

  setProblems(owner: string, uri: string, diagnostics: Diagnostic[]): void {
    let ownerMap = this.problems.get(owner);
    if (!ownerMap) {
      ownerMap = new Map();
      this.problems.set(owner, ownerMap);
    }
    ownerMap.set(uri, diagnostics);
    this.onChangedEmitter.fire({ owner, uri });
  }

  getProblems(uri?: string): Diagnostic[] {
    const results: Diagnostic[] = [];
    for (const [, ownerMap] of this.problems) {
      for (const [fileUri, diagnostics] of ownerMap) {
        if (!uri || fileUri === uri) {
          results.push(...diagnostics);
        }
      }
    }
    return results;
  }

  getProblemsByOwner(owner: string): Map<string, Diagnostic[]> {
    return this.problems.get(owner) || new Map();
  }

  clear(): void {
    this.problems.clear();
  }
}

export function diagnosticToProblemNode(diag: Diagnostic, uri: string, owner: string): ProblemNode {
  return {
    file: uri,
    severity: diag.severity,
    message: diag.message,
    line: diag.range.startLine,
    column: diag.range.startColumn,
    owner,
    code: diag.code,
  };
}
