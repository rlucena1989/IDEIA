import { ScorecardEntry } from './types';
import { createLogger } from '@ideia/logger';
import { ServiceCatalog } from './catalog';
const logger = createLogger('scorecard');

const CATEGORIES = ['code-quality', 'test-coverage', 'documentation', 'security', 'performance', 'reliability'];
const WEIGHTS = [0.25, 0.2, 0.15, 0.2, 0.1, 0.1];

export class ServiceScorecard {
  private history: Map<string, ScorecardEntry[]> = new Map();
  private catalog: ServiceCatalog;

  constructor(catalog: ServiceCatalog) { this.catalog = catalog; }

  evaluate(serviceId: string, scores: Record<string, number>): ScorecardEntry {
    const weighted = CATEGORIES.reduce((acc, cat, i) => acc + (scores[cat] ?? 0) * WEIGHTS[i], 0);
    const overall = Math.round(weighted);
    const grade: ScorecardEntry['grade'] = overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F';
    const entry: ScorecardEntry = { serviceId, scores, overall, grade, timestamp: new Date().toISOString() };
    const list = this.history.get(serviceId) ?? [];
    list.push(entry);
    this.history.set(serviceId, list);
    return entry;
  }

  getHistory(serviceId: string): ScorecardEntry[] { return this.history.get(serviceId) ?? []; }

  getLatest(serviceId: string): ScorecardEntry | undefined {
    const list = this.history.get(serviceId);
    return list ? list[list.length - 1] : undefined;
  }

  getTrend(serviceId: string): 'improving' | 'stable' | 'declining' {
    const list = this.history.get(serviceId);
    if (!list || list.length < 2) return 'stable';
    const recent = list.slice(-5);
    const first = recent[0].overall;
    const last = recent[recent.length - 1].overall;
    return last - first > 5 ? 'improving' : first - last > 5 ? 'declining' : 'stable';
  }

  getLeaderboard(): Array<{ serviceId: string; score: number; grade: string }> {
    return Array.from(this.history.entries())
      .map(([serviceId, entries]) => ({ serviceId, score: entries[entries.length - 1].overall, grade: entries[entries.length - 1].grade }))
      .sort((a, b) => b.score - a.score);
  }
}
