import { Logger } from '@ideia/logger';
import {
  ScanResult,
  ScannerType,
  Trend,
  TrendDirection,
  AnalyzedResult,
  PrioritizedRecommendation,
} from './types';

interface HistoryEntry {
  timestamp: number;
  score: number;
}

export class AnalyzerEngine {
  private logger: Logger;
  private history: Map<ScannerType, HistoryEntry[]>;
  private recommendations: PrioritizedRecommendation[];

  constructor(logger: Logger) {
    this.logger = logger;
    this.history = new Map();
    this.recommendations = [];
  }

  analyze(results: ScanResult[]): AnalyzedResult {
    const trends = this.computeTrends(results);
    this.recommendations = this.buildRecommendations(results, trends);
    const overallHealth = this.computeOverallHealth(results);

    for (const result of results) {
      const entries = this.history.get(result.scanner) ?? [];
      entries.push({ timestamp: result.timestamp, score: result.score });
      if (entries.length > 20) entries.shift();
      this.history.set(result.scanner, entries);
    }

    this.logger.info(
      `Analyzer — ${results.length} scans, overall health ${overallHealth.toFixed(1)}, ${this.recommendations.length} recommendations`
    );

    return {
      timestamp: Date.now(),
      trends,
      recommendations: this.recommendations,
      overallHealth,
    };
  }

  getRecommendations(): PrioritizedRecommendation[] {
    return [...this.recommendations];
  }

  getTrends(): Trend[] {
    const trends: Trend[] = [];
    for (const [scanner, entries] of this.history) {
      if (entries.length < 2) continue;
      const scores = entries.map(e => e.score);
      const delta = scores[scores.length - 1] - scores[0];
      const direction: TrendDirection =
        delta > 5 ? 'improving' : delta < -5 ? 'worsening' : 'stable';
      trends.push({ scanner, direction, delta, history: scores, window: scores.length });
    }
    return trends;
  }

  private computeTrends(results: ScanResult[]): Trend[] {
    const trends: Trend[] = [];
    for (const result of results) {
      const entries = this.history.get(result.scanner) ?? [];
      const scores = [...entries.map(e => e.score), result.score];
      if (scores.length < 2) {
        trends.push({
          scanner: result.scanner,
          direction: 'stable',
          delta: 0,
          history: scores,
          window: scores.length,
        });
        continue;
      }
      const recent = scores.slice(-3);
      const avgThen = recent.slice(0, -1).reduce((a, b) => a + b, 0) / (recent.length - 1);
      const avgNow = recent[recent.length - 1];
      const delta = avgNow - avgThen;
      const direction: TrendDirection =
        delta > 3 ? 'improving' : delta < -3 ? 'worsening' : 'stable';
      trends.push({ scanner: result.scanner, direction, delta, history: scores, window: scores.length });
    }
    return trends;
  }

  private buildRecommendations(
    results: ScanResult[],
    trends: Trend[]
  ): PrioritizedRecommendation[] {
    const recs: PrioritizedRecommendation[] = [];

    for (const result of results) {
      const trend = trends.find(t => t.scanner === result.scanner);
      for (const r of result.recommendations) {
        const confidence = trend?.direction === 'worsening' ? 0.9 : 0.7;
        recs.push({
          action: r.action,
          confidence,
          priority: trend?.direction === 'worsening' ? r.priority - 1 : r.priority,
          effort: r.effort,
          category: r.category,
          rationale: `Scanner ${result.scanner} score ${result.score} — ${trend?.direction ?? 'stable'}`,
        });
      }
    }

    recs.sort((a, b) => a.priority - b.priority || b.confidence - a.confidence);
    return recs;
  }

  private computeOverallHealth(results: ScanResult[]): number {
    if (results.length === 0) return 1;
    return results.reduce((sum, r) => sum + r.score, 0) / results.length / 100;
  }
}
