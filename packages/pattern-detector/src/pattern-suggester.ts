import { PatternStore } from './pattern-store';
import { createLogger } from '@ideia/logger';
import { PatternSuggestion, FrequentError as _FrequentError} from './types';
const logger = createLogger('pattern-suggester');

export class PatternSuggester {
  private store: PatternStore;

  constructor(store: PatternStore) {
    this.store = store;
  }

  generateSuggestions(): PatternSuggestion[] {
    const suggestions: PatternSuggestion[] = [];

    suggestions.push(...this.suggestCommandAutomation());
    suggestions.push(...this.suggestErrorFixes());
    suggestions.push(...this.suggestCodeTemplates());

    for (const s of suggestions) {
      this.store.addSuggestion(s);
    }

    return suggestions;
  }

  private suggestCommandAutomation(): PatternSuggestion[] {
    const suggestions: PatternSuggestion[] = [];
    const commands = this.store.getRepeatedCommands();

    for (const cmd of commands) {
      if (cmd.count >= 3) {
        suggestions.push({
          suggestionId: this.generateId('cmd'),
          patternType: 'command',
          pattern: cmd,
          automationScript: this.generateCommandScript(cmd.command),
          suggestion: `Command "${cmd.command}" detected ${cmd.count}x across ${cmd.sessions.length} sessions. Automate?`,
          confidence: Math.min(cmd.count / 10, 1),
          occurrences: cmd.count,
          createdAt: new Date().toISOString(),
          status: 'pending',
        });
      }
    }

    return suggestions;
  }

  private suggestErrorFixes(): PatternSuggestion[] {
    const suggestions: PatternSuggestion[] = [];
    const errors = this.store.getFrequentErrors();

    for (const err of errors) {
      if (err.count >= 3) {
        suggestions.push({
          suggestionId: this.generateId('err'),
          patternType: 'error',
          pattern: err,
          suggestion: `Error "${err.errorPattern}" occurred ${err.count}x. Consider adding defensive check.`,
          confidence: Math.min(err.count / 8, 1),
          occurrences: err.count,
          createdAt: new Date().toISOString(),
          status: 'pending',
        });
      }
    }

    return suggestions;
  }

  private suggestCodeTemplates(): PatternSuggestion[] {
    const suggestions: PatternSuggestion[] = [];
    const patterns = this.store.getCodePatterns();

    for (const pat of patterns) {
      if (pat.frequency >= 3) {
        suggestions.push({
          suggestionId: this.generateId('code'),
          patternType: 'code',
          pattern: pat,
          suggestion: `Code pattern "${pat.description}" seen ${pat.frequency}x. Create template?`,
          confidence: Math.min(pat.frequency / 6, 1),
          occurrences: pat.frequency,
          createdAt: new Date().toISOString(),
          status: 'pending',
        });
      }
    }

    return suggestions;
  }

  private generateCommandScript(command: string): string {
    return `#!/usr/bin/env bash\n# Auto-generated automation for: ${command}\n${command}\n`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function createPatternSuggester(store: PatternStore): PatternSuggester {
  return new PatternSuggester(store);
}
