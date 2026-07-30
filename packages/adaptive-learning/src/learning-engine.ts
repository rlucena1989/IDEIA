import { FeedbackCollector } from './feedback-collector';
import { createLogger } from '@ideia/logger';
const logger = createLogger('learning-engine');

export interface LearningRecord {
  action: string;
  context: string;
  successCount: number;
  failureCount: number;
  avgScore: number;
  avgLatency: number;
  lastSeen: number;
  patterns: string[];
}

export interface LearningInsight {
  action: string;
  successRate: number;
  trend: 'improving' | 'declining' | 'stable';
  recommendation: string;
  confidence: number;
}

export class LearningEngine {
  private _records: Map<string, LearningRecord> = new Map();
  private _collector: FeedbackCollector;

  constructor(collector: FeedbackCollector) {
    this._collector = collector;
  }

  learn(): void {
    const events = this._collector.getEvents();
    for (const event of events) {
      const key = this._buildKey(event.action, JSON.stringify(event.context));
      const existing = this._records.get(key) || {
        action: event.action,
        context: JSON.stringify(event.context),
        successCount: 0,
        failureCount: 0,
        avgScore: 0,
        avgLatency: 0,
        lastSeen: 0,
        patterns: [],
      };

      if (event.type === 'success' || event.type === 'correction') {
        existing.successCount += 1;
      } else {
        existing.failureCount += 1;
      }

      const total = existing.successCount + existing.failureCount;
      existing.avgScore = ((existing.avgScore * (total - 1)) + event.score) / total;
      existing.avgLatency = ((existing.avgLatency * (total - 1)) + event.latencyMs) / total;
      existing.lastSeen = Math.max(existing.lastSeen, event.timestamp);

      if (event.context && typeof event.context === 'object') {
        for (const key of Object.keys(event.context)) {
          if (!existing.patterns.includes(key)) {
            existing.patterns.push(key);
          }
        }
      }

      this._records.set(key, existing);
    }
  }

  getInsights(): LearningInsight[] {
    const insights: LearningInsight[] = [];
    for (const record of this._records.values()) {
      const total = record.successCount + record.failureCount;
      const successRate = total > 0 ? (record.successCount / total) * 100 : 0;
      const trend = this._determineTrend(record);
      const recommendation = this._generateRecommendation(record);
      const confidence = total > 10 ? 0.9 : total > 5 ? 0.7 : total > 2 ? 0.5 : 0.3;

      insights.push({
        action: record.action,
        successRate,
        trend,
        recommendation,
        confidence,
      });
    }
    return insights;
  }

  getRecommendation(action: string, context: string): string {
    const key = this._buildKey(action, context);
    const record = this._records.get(key);
    if (!record) {
      return 'No data available for this action. Consider manual review.';
    }
    return this._generateRecommendation(record);
  }

  getSuccessRate(action: string): number {
    let totalSuccess = 0;
    let totalFail = 0;
    for (const record of this._records.values()) {
      if (record.action === action) {
        totalSuccess += record.successCount;
        totalFail += record.failureCount;
      }
    }
    const total = totalSuccess + totalFail;
    return total > 0 ? (totalSuccess / total) * 100 : 0;
  }

  getTrends(periods?: number): Map<string, number> {
    const trends = new Map<string, number>();
    for (const record of this._records.values()) {
      const total = record.successCount + record.failureCount;
      const rate = total > 0 ? (record.successCount / total) * 100 : 0;
      const prevRate = total > 1 ? ((record.successCount - 1) / (total - 1)) * 100 : rate;
      trends.set(record.action, rate - prevRate);
    }
    return trends;
  }

  getSuccessRateByCategory(): Map<string, { total: number; success: number; rate: number }> {
    const categoryMap = new Map<string, { total: number; success: number }>();
    for (const record of this._records.values()) {
      const action = record.action.split(':')[0] ?? 'other';
      const existing = categoryMap.get(action) ?? { total: 0, success: 0 };
      existing.total += record.successCount + record.failureCount;
      existing.success += record.successCount;
      categoryMap.set(action, existing);
    }
    const result = new Map<string, { total: number; success: number; rate: number }>();
    for (const [cat, data] of categoryMap) {
      result.set(cat, { ...data, rate: data.total > 0 ? (data.success / data.total) * 100 : 0 });
    }
    return result;
  }

  getLearningProgress(): { totalRecords: number; totalEvents: number; patternsDiscovered: number; lastUpdated: number } {
    const events = this._collector.getEvents();
    let patternsDiscovered = 0;
    for (const record of this._records.values()) {
      patternsDiscovered += record.patterns.length;
    }
    return {
      totalRecords: this._records.size,
      totalEvents: events.length,
      patternsDiscovered,
      lastUpdated: Math.max(0, ...Array.from(this._records.values()).map(r => r.lastSeen)),
    };
  }

  private _buildKey(action: string, context: string): string {
    return `${action}::${context}`;
  }

  private _determineTrend(record: LearningRecord): 'improving' | 'declining' | 'stable' {
    const total = record.successCount + record.failureCount;
    const rate = total > 0 ? (record.successCount / total) * 100 : 0;
    const prevRate = total > 1 ? ((record.successCount - 1) / (total - 1)) * 100 : rate;
    const delta = rate - prevRate;
    if (delta > 5) return 'improving';
    if (delta < -5) return 'declining';
    return 'stable';
  }

  private _generateRecommendation(record: LearningRecord): string {
    const total = record.successCount + record.failureCount;
    const rate = total > 0 ? (record.successCount / total) * 100 : 0;
    if (rate >= 80) {
      return `Action "${record.action}" is reliable. Consider automating.`;
    }
    if (rate >= 50) {
      return `Action "${record.action}" needs monitoring. Review failure patterns.`;
    }
    return `Action "${record.action}" has low success rate. Consider alternative approaches.`;
  }
}
