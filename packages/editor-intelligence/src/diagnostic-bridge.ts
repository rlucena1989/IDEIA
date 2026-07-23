import { DefaultProblemManager } from '@ideia/markers-output';
import { DiagnosticProvider, DiagnosticItem, DiagnosticSeverity, Range, Position } from './types';

export class ProblemDiagnosticBridge {
  constructor(private problemManager: DefaultProblemManager) {}

  provideDiagnosticsFromProblemManager(uri: string): DiagnosticItem[] {
    const problems = this.problemManager.getProblems(uri);
    return problems.map(p => ({
      range: p.range,
      severity: p.severity as unknown as DiagnosticSeverity,
      message: p.message,
      source: p.source,
    }));
  }
}

export function offsetToPosition(offset: number, text: string): Position {
  const lines = text.slice(0, offset).split('\n');
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
  };
}
