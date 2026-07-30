export enum ErrorType {
  TypeError = 'TypeError', ReferenceError = 'ReferenceError', RuntimeError = 'RuntimeError',
  AssertionError = 'AssertionError', CompileError = 'CompileError', LogicError = 'LogicError',
  Performance = 'Performance', Security = 'Security',
}

export enum ErrorSource { Runtime = 'runtime', Test = 'test', Build = 'build', Lint = 'lint', Log = 'log', User = 'user' }

export interface StackFrame {
  file: string; line: number; column: number; functionName: string;
}

export interface NormalizedError {
  type: ErrorType; message: string; stack: StackFrame[]; source: ErrorSource;
  context: { file: string; line: number; column: number; function: string; surroundingCode: string[]; variables: Record<string, unknown> };
  frequency: number; firstSeen: Date; lastSeen: Date;
}

export interface RootCause {
  description: string; confidence: number; location: { file: string; line: number };
  strategy: string; relatedChanges?: string[];
}

export interface FixSuggestion {
  id: string; description: string; diff: string; confidence: number;
  category: 'null_check' | 'type_fix' | 'import_fix' | 'async_fix' | 'boundary_fix' | 'logic_fix' | 'security_fix';
  validation: { compiles: boolean; testsPass: boolean };
}

export interface DebugREPLCommand {
  name: string; description: string;
  handler: (args: string[], context: DebugContext) => Promise<REPLResult>;
}

export interface DebugContext {
  currentFile?: string; currentLine?: number; error?: NormalizedError;
  variables: Record<string, unknown>; stackFrames: StackFrame[];
}

export interface REPLResult { type: 'text' | 'diff' | 'error'; content: string; }
