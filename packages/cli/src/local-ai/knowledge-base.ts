import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';

import { KnowledgeEntry, CURATED_ENTRIES } from './knowledge-entries';

export { KnowledgeEntry };

const ENTRIES_DIR = '.ai/knowledge/entries';

export function getCuratedEntries(): KnowledgeEntry[] {
  return CURATED_ENTRIES;
}

export function searchEntries(query: string, entries?: KnowledgeEntry[]): KnowledgeEntry[] {
  const list = entries || CURATED_ENTRIES;
  const q = query.toLowerCase();

  return list.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.summary.toLowerCase().includes(q) ||
    e.content.toLowerCase().includes(q) ||
    e.tags.some(t => t.toLowerCase().includes(q)) ||
    e.category.toLowerCase().includes(q)
  ).slice(0, 20);
}

export function getEntry(id: string): KnowledgeEntry | undefined {
  return CURATED_ENTRIES.find(e => e.id === id);
}

export function exportEntries(root: string, id?: string): void {
  const dir = path.join(root, ENTRIES_DIR);
  fs.mkdirSync(dir, { recursive: true });

  const entries = id ? CURATED_ENTRIES.filter(e => e.id === id) : CURATED_ENTRIES;
  for (const entry of entries) {
    const filePath = path.join(dir, `${entry.id}.yaml`);
    if (!fs.existsSync(filePath)) {
      const yaml = `id: ${entry.id}\ntitle: "${entry.title}"\ncategory: ${entry.category}\ntags: [${entry.tags.map(t => `"${t}"`).join(', ')}]\nsummary: "${entry.summary}"\ncontent: |\n  ${entry.content.split('\n').join('\n  ')}\n`;
      fs.writeFileSync(filePath, yaml, 'utf-8');
    }
  }
}
