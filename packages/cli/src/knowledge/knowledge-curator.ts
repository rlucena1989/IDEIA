import { KnowledgeEntry } from './knowledge-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('knowledge-curator');

export function curateKnowledge(entries: KnowledgeEntry[]): KnowledgeEntry[] {
  const seen = new Set<string>();
  return entries.filter(entry => {
    const key = `${entry.category}:${entry.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return entry.status !== 'obsolete';
  });
}
