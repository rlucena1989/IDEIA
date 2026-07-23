import { describe, it, expect } from '@jest/globals';
import { prioritizeInconsistencies, summarizePriorities } from '../consistency-prioritizer';
import { buildConsistencyReport } from '../consistency-builder';
import { ConsistencyReport } from '../consistency-types';

describe('consistency-prioritizer', () => {
  it('prioritizeInconsistencies should be defined', () => {
    expect(prioritizeInconsistencies).toBeDefined();
  });

  it('should return sorted items from report', () => {
    const report = buildConsistencyReport();
    const items = prioritizeInconsistencies(report);
    expect(items.length).toBeGreaterThan(0);
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].score).toBeGreaterThanOrEqual(items[i].score);
    }
  });

  it('should detect critical area with all missing', () => {
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [
        { area: 'Tudo faltando', docs: 'missing', code: 'missing', tests: 'missing', cli: 'missing', extension: 'missing', status: 'blocked', notes: [] },
      ],
      summary: [],
    };
    const items = prioritizeInconsistencies(report);
    expect(items[0].risk).toBe('critical');
    expect(items[0].score).toBeGreaterThanOrEqual(12);
    expect(items[0].gaps.length).toBe(5);
  });

  it('summarizePriorities should be defined', () => {
    expect(summarizePriorities).toBeDefined();
  });
});
