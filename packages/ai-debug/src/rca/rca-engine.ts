import { NormalizedError, RootCause } from '../types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('rca-engine');

interface RCAStrategy {
  name: string;
  analyze(error: NormalizedError): Promise<RootCause | null>;
}

class ASTAnalysisStrategy implements RCAStrategy {
  name = 'AST Analysis';
  async analyze(error: NormalizedError): Promise<RootCause | null> {
    if (error.type === 'TypeError') {
      return {
        description: `Type error at ${error.context.function}: possible missing null check or type guard`,
        confidence: 0.7,
        location: { file: error.context.file, line: error.context.line },
        strategy: 'Add type guard or null check before access',
      };
    }
    return null;
  }
}

class PatternMatchingStrategy implements RCAStrategy {
  name = 'Pattern Matching';
  private patterns = [
    { regex: /Cannot read properties of undefined/i, description: 'Accessing property on undefined value', strategy: 'Add optional chaining (?.) or null check' },
    { regex: /is not a function/i, description: 'Calling a non-function value', strategy: 'Verify the value is a function before calling' },
    { regex: /is not defined/i, description: 'Referencing an undefined variable', strategy: 'Check variable scope and imports' },
    { regex: /Cannot find module/i, description: 'Missing module import', strategy: 'Install missing dependency or fix import path' },
  ];

  async analyze(error: NormalizedError): Promise<RootCause | null> {
    for (const p of this.patterns) {
      if (p.regex.test(error.message)) {
        return {
          description: p.description,
          confidence: 0.85,
          location: { file: error.context.file, line: error.context.line },
          strategy: p.strategy,
        };
      }
    }
    return null;
  }
}

export class RCAEngine {
  private strategies: RCAStrategy[];

  constructor() {
    this.strategies = [new ASTAnalysisStrategy(), new PatternMatchingStrategy()];
  }

  async analyze(error: NormalizedError): Promise<RootCause> {
    for (const strategy of this.strategies) {
      const result = await strategy.analyze(error);
      if (result) return result;
    }

    return {
      description: `Unhandled error in ${error.context.function}: ${error.message}`,
      confidence: 0.3,
      location: { file: error.context.file, line: error.context.line },
      strategy: 'Review the error context and add specific handling',
    };
  }

  addStrategy(strategy: RCAStrategy): void {
    this.strategies.push(strategy);
  }
}
