import { ContentItem, DedupResult } from './semantic-dedup';
import { createLogger } from '@ideia/logger';
const logger = createLogger('session-merger');

export interface MergeStrategy {
  type: 'latest-wins' | 'most-complete' | 'weighted-average' | 'manual';
}

export interface MergedContent {
  id: string;
  content: string;
  mergedFrom: string[];
  strategy: MergeStrategy;
  timestamp: number;
  conflicts: number;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export class SessionMerger {
  merge(duplicates: DedupResult[], strategy: MergeStrategy): MergedContent {
    const allItems = [duplicates[0].original, ...duplicates[0].duplicates];
    let content: string;

    switch (strategy.type) {
      case 'latest-wins':
        content = this._latestWins(allItems);
        break;
      case 'most-complete':
        content = this._mostComplete(allItems);
        break;
      case 'weighted-average':
        content = this._weightedAverage(allItems);
        break;
      case 'manual':
        content = this._latestWins(allItems);
        break;
    }

    const conflicts = this.detectConflicts(allItems);

    return {
      id: generateId(),
      content,
      mergedFrom: allItems.map(i => i.id),
      strategy,
      timestamp: Date.now(),
      conflicts: conflicts.length,
    };
  }

  private _latestWins(items: ContentItem[]): string {
    const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0]?.content ?? '';
  }

  private _mostComplete(items: ContentItem[]): string {
    const sorted = [...items].sort((a, b) => b.content.length - a.content.length);
    return sorted[0]?.content ?? '';
  }

  private _weightedAverage(items: ContentItem[]): string {
    const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
    if (sorted.length === 0) return '';
    const segments = sorted.map((item, idx) => {
      const weight = sorted.length - idx;
      return item.content.repeat(weight);
    });
    return segments.join('\n---\n');
  }

  detectConflicts(items: ContentItem[]): { field: string; values: string[] }[] {
    const conflicts: { field: string; values: string[] }[] = [];
    const sessions = new Set(items.map(i => i.session));

    if (sessions.size > 1) {
      conflicts.push({
        field: 'session',
        values: [...sessions],
      });
    }

    const sources = new Set(items.map(i => i.source));
    if (sources.size > 1) {
      conflicts.push({
        field: 'source',
        values: [...sources],
      });
    }

    const contents = new Set(items.map(i => i.content));
    if (contents.size > 1) {
      conflicts.push({
        field: 'content',
        values: [...contents],
      });
    }

    return conflicts;
  }

  autoResolve(
    conflicts: { field: string; values: string[] }[],
    strategy: MergeStrategy
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const conflict of conflicts) {
      switch (strategy.type) {
        case 'latest-wins':
          resolved[conflict.field] = conflict.values[conflict.values.length - 1] ?? '';
          break;
        case 'most-complete': {
          let longest = '';
          for (const v of conflict.values) {
            if (v.length > longest.length) longest = v;
          }
          resolved[conflict.field] = longest;
          break;
        }
        case 'weighted-average':
          resolved[conflict.field] = conflict.values.join(' | ');
          break;
        case 'manual':
          resolved[conflict.field] = conflict.values[0] ?? '';
          break;
      }
    }

    return resolved;
  }
}
