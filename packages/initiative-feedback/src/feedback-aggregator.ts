import { InitiativeCycleResult } from './types';
import { createLogger } from '@ideia/logger';
import { FeedbackEntry} from './feedback-collector';
const logger = createLogger('feedback-aggregator');

export interface AggregatedMetric {
  totalCycles: number;
  totalFixesApplied: number;
  totalFixesFailed: number;
  totalScanned: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  topImprovements: string[];
}

export class FeedbackAggregator {
  aggregate(cycles: InitiativeCycleResult[], feedbacks: FeedbackEntry[]): AggregatedMetric {
    const totalCycles = cycles.length;
    const totalScanned = cycles.reduce((s, c) => s + c.scanned, 0);
    const totalFixesApplied = cycles.reduce((s, c) => s + c.applied, 0);
    const totalFixesFailed = cycles.reduce((s, c) => s + c.failed, 0);
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const f of feedbacks) {
      ratingDistribution[f.rating] = (ratingDistribution[f.rating] ?? 0) + 1;
    }
    const sumRatings = feedbacks.reduce((s, f) => s + f.rating, 0);
    const averageRating = feedbacks.length > 0 ? sumRatings / feedbacks.length : 0;
    const topImprovements = this.extractTopImprovements(cycles);
    return { totalCycles, totalFixesApplied, totalFixesFailed, totalScanned, averageRating, ratingDistribution, topImprovements };
  }

  private extractTopImprovements(cycles: InitiativeCycleResult[]): string[] {
    const fileCounts = new Map<string, number>();
    for (const cycle of cycles) {
      for (const result of cycle.results) {
        fileCounts.set(result.filePath, (fileCounts.get(result.filePath) ?? 0) + 1);
      }
    }
    return Array.from(fileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file]) => file);
  }
}

export function createFeedbackAggregator(): FeedbackAggregator {
  return new FeedbackAggregator();
}
