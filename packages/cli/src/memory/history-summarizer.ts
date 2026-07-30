import type { MemoryRecord, MemoryPattern, LearningRecommendation } from '@ideia/contracts';
import { createLogger } from '@ideia/logger';
const logger = createLogger('history-summarizer');

export interface HistorySummary {
  totalRecords: number;
  byCategory: Record<string, number>;
  patternsFound: number;
  recommendationsGenerated: number;
}

export function summarizeHistory(
  records: MemoryRecord[],
  patterns: MemoryPattern[],
  recommendations: LearningRecommendation[]
): HistorySummary {
  const byCategory: Record<string, number> = {};
  for (const r of records) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  }

  return {
    totalRecords: records.length,
    byCategory,
    patternsFound: patterns.length,
    recommendationsGenerated: recommendations.length,
  };
}
