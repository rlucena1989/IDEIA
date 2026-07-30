import type { MemoryRecord, MemoryPattern, LearningRecommendation } from '@ideia/contracts';
import { createLogger } from '@ideia/logger';
import { PolicyAdjustment } from './policy-adapter';
import { HistorySummary } from './history-summarizer';
const logger = createLogger('memory-report');

export interface MemoryReport {
  generatedAt: string;
  summary: HistorySummary;
  recentRecords: MemoryRecord[];
  patterns: MemoryPattern[];
  recommendations: LearningRecommendation[];
  adjustments: PolicyAdjustment[];
  notes: string[];
}

export function buildMemoryReport(params: {
  summary: HistorySummary;
  recentRecords: MemoryRecord[];
  patterns: MemoryPattern[];
  recommendations: LearningRecommendation[];
  adjustments: PolicyAdjustment[];
}): MemoryReport {
  const notes: string[] = [
    `${params.summary.totalRecords} registro(s) de memória`,
    `${params.summary.patternsFound} padrão(ões) detectado(s)`,
    `${params.summary.recommendationsGenerated} recomendação(ões)`,
    `${params.adjustments.length} ajuste(s) de política`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    notes,
  };
}
