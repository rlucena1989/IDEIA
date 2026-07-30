import { NormalizedError, ErrorType, ErrorSource, StackFrame } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('error-normalizer');

export class ErrorNormalizer {
  async normalize(error: Error): Promise<NormalizedError> {
    const type = this.classify(error);
    const stack = this.parseStack(error.stack ?? '');
    const source = this.identifySource(error);
    return {
      type,
      message: error.message,
      stack,
      source,
      context: {
        file: stack[0]?.file ?? 'unknown',
        line: stack[0]?.line ?? 0,
        column: stack[0]?.column ?? 0,
        function: stack[0]?.functionName ?? 'unknown',
        surroundingCode: [],
        variables: {},
      },
      frequency: 1,
      firstSeen: new Date(),
      lastSeen: new Date(),
    };
  }

  private classify(error: Error): ErrorType {
    const msg = error.message;
    if (error instanceof TypeError || msg.includes('is not a function') || msg.includes('cannot read properties')) return ErrorType.TypeError;
    if (error instanceof ReferenceError || msg.includes('is not defined')) return ErrorType.ReferenceError;
    if (error instanceof RangeError) return ErrorType.RuntimeError;
    if (msg.includes('assert') || msg.includes('expected')) return ErrorType.AssertionError;
    if (msg.includes('compil') || msg.includes('syntax')) return ErrorType.CompileError;
    if (msg.includes('perform') || msg.includes('timeout')) return ErrorType.Performance;
    return ErrorType.RuntimeError;
  }

  private parseStack(stack: string): StackFrame[] {
    const frames: StackFrame[] = [];
    const lines = stack.split('\n');
    const regex = /at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/;
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        frames.push({
          functionName: match[1] ?? '<anonymous>',
          file: match[2],
          line: parseInt(match[3], 10),
          column: parseInt(match[4], 10),
        });
      }
    }
    return frames;
  }

  private identifySource(error: Error): ErrorSource {
    const msg = error.message;
    if (msg.includes('test') || msg.includes('expect')) return ErrorSource.Test;
    if (msg.includes('TS') || msg.includes('compil')) return ErrorSource.Build;
    return ErrorSource.Runtime;
  }
}
