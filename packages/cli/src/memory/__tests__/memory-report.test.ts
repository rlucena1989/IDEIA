import { buildMemoryReport } from '../memory-report';
import type { MemoryRecord, MemoryPattern, LearningRecommendation } from '@ideia/contracts';
import type { PolicyAdjustment } from '../policy-adapter';
import type { HistorySummary } from '../history-summarizer';

describe('buildMemoryReport', () => {
  const baseSummary: HistorySummary = {
    totalRecords: 5,
    byCategory: { cycle: 3, failure: 2 },
    patternsFound: 2,
    recommendationsGenerated: 1,
  };

  const mockRecord: MemoryRecord = {
    memoryId: 'm1', category: 'cycle', source: 'test',
    summary: 'record', tags: ['a'], createdAt: new Date().toISOString(),
  };

  const mockPattern: MemoryPattern = {
    patternId: 'p1', name: 'frequent-failure', frequency: 10,
    confidence: 0.9, description: 'recurring failure pattern',
    detectedAt: new Date().toISOString(),
  };

  const mockRec: LearningRecommendation = {
    recommendationId: 'r1', target: 'system', action: 'check',
    rationale: 'prevent', confidence: 0.8,
  };

  const mockAdjustment: PolicyAdjustment = {
    adjustmentId: 'adj1', policyName: 'retry-policy',
    change: 'increase timeout', approved: true, reason: 'High confidence',
  };

  it('builds report with all fields', () => {
    const report = buildMemoryReport({
      summary: baseSummary,
      recentRecords: [mockRecord],
      patterns: [mockPattern],
      recommendations: [mockRec],
      adjustments: [mockAdjustment],
    });
    expect(report.generatedAt).toBeDefined();
    expect(report.summary).toBe(baseSummary);
    expect(report.recentRecords).toHaveLength(1);
    expect(report.patterns).toHaveLength(1);
    expect(report.recommendations).toHaveLength(1);
    expect(report.adjustments).toHaveLength(1);
  });

  it('generates notes from summary and adjustments', () => {
    const report = buildMemoryReport({
      summary: baseSummary,
      recentRecords: [],
      patterns: [],
      recommendations: [],
      adjustments: [],
    });
    expect(report.notes).toContain('5 registro(s) de memória');
    expect(report.notes).toContain('2 padrão(ões) detectado(s)');
    expect(report.notes).toContain('1 recomendação(ões)');
    expect(report.notes).toContain('0 ajuste(s) de política');
  });

  it('handles empty arrays', () => {
    const emptySummary: HistorySummary = {
      totalRecords: 0, byCategory: {}, patternsFound: 0, recommendationsGenerated: 0,
    };
    const report = buildMemoryReport({
      summary: emptySummary,
      recentRecords: [],
      patterns: [],
      recommendations: [],
      adjustments: [],
    });
    expect(report.notes).toHaveLength(4);
  });
});
