import { KnowledgeEntry } from './knowledge-types';
import { createLogger } from '@ideia/logger';

export function buildRunbook(entries: KnowledgeEntry[]): string {
  const active = entries.filter(e => e.status === 'active');
  return active
    .map(e => `- [${e.category}] ${e.title}: ${e.content}`)
    .join('\n');
}

export function buildRunbookSections(entries: KnowledgeEntry[]): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  for (const e of entries.filter(e => e.status === 'active')) {
    const cat = e.category;
    if (!sections[cat]) sections[cat] = [];
    sections[cat]?.push(`${e.title}: ${e.content}`);
  }
  return sections;
}
