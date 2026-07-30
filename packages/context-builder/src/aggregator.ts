import { ContextItem, ContextSource, TaskProfile, ContextAggregatorResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('aggregator');

export type SourceProvider = (profile: TaskProfile, source: ContextSource) => Promise<ContextItem[]>;

export class ContextAggregator {
  private providers: Map<string, SourceProvider> = new Map();

  registerSource(name: string, provider: SourceProvider): void {
    this.providers.set(name, provider);
  }

  unregisterSource(name: string): void {
    this.providers.delete(name);
  }

  async aggregate(profile: TaskProfile, sources: ContextSource[]): Promise<ContextAggregatorResult[]> {
    const results: ContextAggregatorResult[] = [];

    for (const source of sources.sort((a, b) => b.priority - a.priority)) {
      const provider = this.providers.get(source.name);
      if (!provider) continue;

      try {
        const items = await provider(profile, source);
        if (items.length > 0) {
          results.push({ items: items.slice(0, source.maxItems), sourceName: source.name });
        }
      } catch {
        continue;
      }
    }

    return results;
  }

  async aggregateAll(profile: TaskProfile): Promise<ContextAggregatorResult[]> {
    const sources: ContextSource[] = Array.from(this.providers.keys()).map(name => ({
      name,
      priority: 5,
      maxItems: 20,
    }));
    return this.aggregate(profile, sources);
  }

  getRegisteredSources(): string[] {
    return Array.from(this.providers.keys());
  }
}
