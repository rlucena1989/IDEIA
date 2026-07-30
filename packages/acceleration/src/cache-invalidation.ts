import { CacheEntry } from './cache';
import { createLogger } from '@ideia/logger';

export type InvalidationStrategy = 'ttl' | 'version' | 'manual' | 'dependency';

export interface InvalidationRule {
  strategy: InvalidationStrategy;
  maxAgeMs?: number;
  version?: string;
  dependencies?: string[];
}

export function shouldInvalidate(entry: CacheEntry, rule: InvalidationRule): boolean {
  if (rule.strategy === 'ttl' && rule.maxAgeMs) {
    const age = Date.now() - new Date(entry.createdAt).getTime();
    if (age > rule.maxAgeMs) return true;
  }
  if (rule.strategy === 'version' && rule.version) {
    return false;
  }
  return false;
}

export function invalidateByAgeMap(entries: Map<string, CacheEntry>, maxAgeMs: number): string[] {
  const invalidated: string[] = [];
  for (const [key, entry] of entries) {
    if (Date.now() - new Date(entry.createdAt).getTime() > maxAgeMs) {
      entries.delete(key);
      invalidated.push(key);
    }
  }
  return invalidated;
}

export function invalidateByPrefixMap(entries: Map<string, CacheEntry>, prefix: string): string[] {
  const invalidated: string[] = [];
  for (const [key] of entries) {
    if (key.startsWith(prefix)) {
      entries.delete(key);
      invalidated.push(key);
    }
  }
  return invalidated;
}


