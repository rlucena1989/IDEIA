import { ContextItem, ScoredContextItem } from './types';
import { createLogger } from '@ideia/logger';
import { createHash } from 'crypto';
const logger = createLogger('deduplicator');

export class ContextDeduplicator {
  private similarityThreshold: number;

  constructor(similarityThreshold = 0.85) {
    this.similarityThreshold = similarityThreshold;
  }

  deduplicate(items: ContextItem[]): ContextItem[] {
    const seen = new Map<string, ContextItem>();

    for (const item of items) {
      const key = this.makeContentKey(item.content);
      const existing = seen.get(key);

      if (!existing) {
        seen.set(key, item);
      } else if (item.confidence > existing.confidence) {
        seen.set(key, item);
      }
    }

    return Array.from(seen.values());
  }

  deduplicateScored(items: ScoredContextItem[]): ScoredContextItem[] {
    const seen = new Map<string, ScoredContextItem>();

    for (const item of items) {
      const key = this.makeContentKey(item.content);
      const existing = seen.get(key);

      if (!existing) {
        seen.set(key, item);
      } else if (item.score > existing.score) {
        seen.set(key, item);
      }
    }

    return Array.from(seen.values());
  }

  private makeContentKey(content: string): string {
    const normalized = content
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }
}
