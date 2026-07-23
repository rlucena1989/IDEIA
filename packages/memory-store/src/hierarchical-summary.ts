/**
 * hierarchical-summary.ts — Hierarchical Summarization (Item 35)
 *
 * Compressão hierárquica de memória em 5 níveis:
 * raw → session → daily → weekly → global
 */

export interface SummaryLevel {
  level: string;
  maxEntries: number;
  ttlMs: number;
}

export interface SummaryEntry {
  id: string;
  level: string;
  content: string;
  sourceIds: string[];
  createdAt: string;
}

const LEVELS: SummaryLevel[] = [
  { level: 'raw', maxEntries: 500, ttlMs: 3600000 },
  { level: 'session', maxEntries: 100, ttlMs: 86400000 },
  { level: 'daily', maxEntries: 30, ttlMs: 604800000 },
  { level: 'weekly', maxEntries: 12, ttlMs: 2592000000 },
  { level: 'global', maxEntries: 50, ttlMs: Infinity },
];

export class HierarchicalSummarizer {
  private entries: SummaryEntry[] = [];

  addEntry(content: string, sourceIds: string[], level = 'raw'): SummaryEntry {
    const entry: SummaryEntry = {
      id: `sum-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      level,
      content: content.slice(0, 2000),
      sourceIds,
      createdAt: new Date().toISOString(),
    };
    this.entries.push(entry);
    this.compressIfNeeded(level);
    return entry;
  }

  query(level: string, since?: Date): SummaryEntry[] {
    return this.entries.filter(e => {
      if (e.level !== level) return false;
      if (since && new Date(e.createdAt) < since) return false;
      return true;
    });
  }

  getContext(levels: string[] = ['session', 'daily']): string {
    return this.entries
      .filter(e => levels.includes(e.level))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(e => `[${e.level}] ${e.content}`)
      .join('\n');
  }

  private compressIfNeeded(level: string): void {
    const levelConfig = LEVELS.find(l => l.level === level);
    if (!levelConfig) return;
    const levelEntries = this.entries.filter(e => e.level === level);
    if (levelEntries.length <= levelConfig.maxEntries) return;

    const sorted = levelEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const toRemove = sorted.slice(levelConfig.maxEntries);
    const removedIds = new Set(toRemove.map(e => e.id));

    const nextLevelIdx = LEVELS.findIndex(l => l.level === level) + 1;
    if (nextLevelIdx < LEVELS.length) {
      const nextLevel = LEVELS[nextLevelIdx];
      const summary = toRemove.map(e => e.content).join('\n').slice(0, 1000);
      this.addEntry(summary, toRemove.map(e => e.id), nextLevel.level);
    }

    this.entries = this.entries.filter(e => !removedIds.has(e.id));
  }
}
