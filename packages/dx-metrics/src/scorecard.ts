import { DevExScorecard } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('scorecard');

const CATEGORIES = [
  { name: 'deploy-frequency', weight: 0.2, thresholds: [10, 5, 2, 1] },
  { name: 'lead-time', weight: 0.15, thresholds: [1, 24, 72, 168] },
  { name: 'change-failure-rate', weight: 0.2, thresholds: [0.05, 0.1, 0.2, 0.3] },
  { name: 'recovery-time', weight: 0.15, thresholds: [60, 240, 480, 1440] },
  { name: 'test-coverage', weight: 0.15, thresholds: [80, 60, 40, 20] },
  { name: 'code-quality', weight: 0.15, thresholds: [90, 70, 50, 30] },
];

export class DevExScorecardEngine {
  private history: DevExScorecard[][] = [];

  evaluate(scores: Record<string, number>): DevExScorecard[] {
    const cards: DevExScorecard[] = CATEGORIES.map(cat => {
      const value = scores[cat.name] ?? 0;
      const gradeIdx = cat.thresholds.findIndex(t => value >= t);
      const grade: DevExScorecard['grade'] = gradeIdx === -1 ? 'F' : gradeIdx === 0 ? 'A' : gradeIdx === 1 ? 'B' : gradeIdx === 2 ? 'C' : 'D';
      const maxScore = cat.thresholds[0];
      const score = Math.min(100, (value / maxScore) * 100);
      return { category: cat.name, weight: cat.weight, score: Math.round(score), maxScore: 100, grade, trend: 'stable' };
    });
    this.history.push(cards);
    return cards;
  }

  getOverall(cards: DevExScorecard[]): { score: number; grade: DevExScorecard['grade'] } {
    const weighted = cards.reduce((acc, c) => acc + c.score * c.weight, 0);
    const overall = Math.round(weighted);
    const grade: DevExScorecard['grade'] = overall >= 90 ? 'A' : overall >= 70 ? 'B' : overall >= 50 ? 'C' : overall >= 30 ? 'D' : 'F';
    return { score: overall, grade };
  }

  getHistory(): DevExScorecard[][] { return [...this.history]; }

  getTrend(category: string): 'improving' | 'stable' | 'declining' {
    if (this.history.length < 2) return 'stable';
    const recent = this.history.slice(-3);
    const values = recent.map(h => h.find(c => c.category === category)?.score ?? 0);
    if (values.length < 2) return 'stable';
    const trend = values[values.length - 1] - values[0];
    return trend > 5 ? 'improving' : trend < -5 ? 'declining' : 'stable';
  }
}
