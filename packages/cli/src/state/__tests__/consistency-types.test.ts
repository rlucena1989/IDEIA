import { describe, it, expect } from '@jest/globals';
import type { ConsistencyItem, ConsistencyReport } from '../consistency-types';

describe('consistency-types', () => {
  it('ConsistencyItem should be constructible', () => {
    const item: ConsistencyItem = {
      area: 'test',
      docs: 'ok',
      code: 'ok',
      tests: 'partial',
      cli: 'missing',
      extension: 'stale',
      status: 'attention',
      notes: ['Note 1'],
    };
    expect(item.area).toBe('test');
    expect(item.status).toBe('attention');
  });

  it('ConsistencyItem should accept all status values', () => {
    const statuses: Array<ConsistencyItem['docs']> = ['ok', 'partial', 'missing', 'stale'];
    for (const s of statuses) {
      const item: ConsistencyItem = {
        area: 'test', docs: s, code: s, tests: s, cli: s, extension: s,
        status: 'ok', notes: [],
      };
      expect(item.docs).toBeDefined();
    }
  });

  it('ConsistencyReport should be constructible', () => {
    const item: ConsistencyItem = {
      area: 'Governança',
      docs: 'ok', code: 'ok', tests: 'ok',
      cli: 'ok', extension: 'ok',
      status: 'ok', notes: ['All good'],
    };
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [item],
      summary: ['Resumo completo'],
    };
    expect(report.items).toHaveLength(1);
    expect(report.summary[0]).toBe('Resumo completo');
  });

  it('ConsistencyReport should handle empty items', () => {
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [],
      summary: [],
    };
    expect(report.items).toEqual([]);
  });

  it('ConsistencyReport should handle multiple items', () => {
    const items: ConsistencyItem[] = [
      { area: 'A', docs: 'ok', code: 'partial', tests: 'ok', cli: 'ok', extension: 'ok', status: 'ok', notes: [] },
      { area: 'B', docs: 'missing', code: 'missing', tests: 'missing', cli: 'missing', extension: 'missing', status: 'blocked', notes: ['Critical'] },
    ];
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items,
      summary: ['Test'],
    };
    expect(report.items[0].area).toBe('A');
    expect(report.items[1].status).toBe('blocked');
  });
});
