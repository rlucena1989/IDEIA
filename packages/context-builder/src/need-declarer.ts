import { ContextSource } from './types-budget';
import { createLogger } from '@ideia/logger';
import { SourceNeed } from './types-budget';
import { TaskProfile } from './types-budget';
const logger = createLogger('need-declarer');

export class NeedDeclarer {
  declare(sources: ContextSource[], _profile: TaskProfile): SourceNeed[] {
    return sources.map(source => {
      const minTokens = this.calculateMinTokens(source);
      const desiredTokens = this.calculateDesiredTokens(source);
      return {
        sourceId: source.id,
        minTokens,
        desiredTokens,
        priority: source.priority,
        urgency: 0,
        isRequired: source.isRequired,
      };
    });
  }

  calculateMinTokens(source: ContextSource): number {
    switch (source.type) {
      case 'system':
        return Math.min(source.tokenCount, 500);
      case 'history':
        return Math.max(1, Math.floor(source.tokenCount * 0.1));
      case 'document':
        return Math.max(1, Math.floor(source.tokenCount * 0.05));
      case 'tool':
        return Math.max(1, Math.floor(source.tokenCount * 0.15));
      case 'memory':
        return Math.max(1, Math.floor(source.tokenCount * 0.1));
      case 'instruction':
        return Math.min(source.tokenCount, 300);
      default:
        return Math.max(1, Math.floor(source.tokenCount * 0.1));
    }
  }

  calculateDesiredTokens(source: ContextSource): number {
    const typeFactor = this.getTypeFactor(source.type);
    const priorityFactor = source.priority / 100;
    const multiplier = priorityFactor * 0.6 + typeFactor * 0.4;
    return Math.min(
      source.tokenCount,
      Math.floor(source.tokenCount * Math.max(0.1, multiplier))
    );
  }

  detectRequiredSources(sources: ContextSource[]): ContextSource[] {
    return sources.filter(source => source.isRequired);
  }

  private getTypeFactor(type: ContextSource['type']): number {
    switch (type) {
      case 'system':
        return 1.0;
      case 'instruction':
        return 0.9;
      case 'tool':
        return 0.7;
      case 'memory':
        return 0.6;
      case 'history':
        return 0.5;
      case 'document':
        return 0.4;
      default:
        return 0.5;
    }
  }
}
