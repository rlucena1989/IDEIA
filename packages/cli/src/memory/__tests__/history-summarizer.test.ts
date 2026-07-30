import { summarizeHistory } from '../history-summarizer';
import type { MemoryRecord, MemoryPattern, LearningRecommendation } from '@ideia/contracts';

describe('summarizeHistory', () => {
  const makeRecord = (category: MemoryRecord['category'], id?: string): MemoryRecord => ({
    memoryId: id ?? `mem-${Math.random()}`,
    category,
    source: 'test',
    summary: 'test record',
    tags: ['test'],
    createdAt: new Date().toISOString(),
  });

  const makePattern = (name: string): MemoryPattern => ({
    patternId: `p-${name}`,
    name,
    frequency: 5,
    confidence: 0.8,
    description: 'test pattern',
    detectedAt: new Date().toISOString(),
  });

  const makeRecommendation = (target: string): LearningRecommendation => ({
    recommendationId: `r-${target}`,
    target,
    action: 'review',
    rationale: 'test recommendation',
    confidence: 0.7,
  });

  it('summarizes empty collections', () => {
    const summary = summarizeHistory([], [], []);
    expect(summary.totalRecords).toBe(0);
    expect(summary.patternsFound).toBe(0);
    expect(summary.recommendationsGenerated).toBe(0);
    expect(summary.byCategory).toEqual({});
  });

  it('counts total records', () => {
    const records = [makeRecord('cycle'), makeRecord('failure')];
    const summary = summarizeHistory(records, [], []);
    expect(summary.totalRecords).toBe(2);
  });

  it('groups records by category', () => {
    const records = [
      makeRecord('cycle', 'c1'),
      makeRecord('cycle', 'c2'),
      makeRecord('failure', 'f1'),
    ];
    const summary = summarizeHistory(records, [], []);
    expect(summary.byCategory).toEqual({ cycle: 2, failure: 1 });
  });

  it('counts patterns found', () => {
    const patterns = [makePattern('p1'), makePattern('p2')];
    const summary = summarizeHistory([], patterns, []);
    expect(summary.patternsFound).toBe(2);
  });

  it('counts recommendations generated', () => {
    const recs = [makeRecommendation('t1')];
    const summary = summarizeHistory([], [], recs);
    expect(summary.recommendationsGenerated).toBe(1);
  });

  it('includes all data types together', () => {
    const records = [makeRecord('policy')];
    const patterns = [makePattern('trend')];
    const recs = [makeRecommendation('optimize')];
    const summary = summarizeHistory(records, patterns, recs);
    expect(summary.totalRecords).toBe(1);
    expect(summary.patternsFound).toBe(1);
    expect(summary.recommendationsGenerated).toBe(1);
  });

  it('handles records with missing category gracefully', () => {
    const records = [makeRecord('change')];
    const summary = summarizeHistory(records, [], []);
    expect(summary.byCategory.change).toBe(1);
  });
});
