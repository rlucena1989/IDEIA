import { checkConsistency } from '../consistency-checker';
import { ConsistencyReport } from '../../state/consistency-types';

function makeEmptyReport(): ConsistencyReport {
  return {
    generatedAt: new Date().toISOString(),
    items: [],
    summary: ['Empty report'],
  };
}

function makeItem(area: string, status: 'ok' | 'attention' | 'blocked') {
  return {
    area,
    docs: 'ok' as const,
    code: 'ok' as const,
    tests: 'ok' as const,
    cli: 'ok' as const,
    extension: 'ok' as const,
    status,
    notes: [],
  };
}

describe('consistency-checker', () => {
  test('returns ok for empty report', () => {
    const result = checkConsistency(makeEmptyReport());
    expect(result.ok).toBe(true);
    expect(result.blockedCount).toBe(0);
    expect(result.attentionCount).toBe(0);
  });

  test('returns ok when all items are ok', () => {
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [
        makeItem('hardening', 'ok'),
        makeItem('ecosystem', 'ok'),
      ],
      summary: ['All good'],
    };
    const result = checkConsistency(report);
    expect(result.ok).toBe(true);
  });

  test('detects blocked items and returns not ok', () => {
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [
        makeItem('hardening', 'blocked'),
        makeItem('ecosystem', 'ok'),
      ],
      summary: ['Blocked item'],
    };
    const result = checkConsistency(report);
    expect(result.ok).toBe(false);
    expect(result.blockedCount).toBe(1);
  });

  test('counts attention items', () => {
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [
        makeItem('hardening', 'attention'),
        makeItem('ecosystem', 'attention'),
        makeItem('security', 'ok'),
      ],
      summary: ['Attention needed'],
    };
    const result = checkConsistency(report);
    expect(result.ok).toBe(true);
    expect(result.attentionCount).toBe(2);
  });

  test('counts multiple blocked items', () => {
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [
        makeItem('a', 'blocked'),
        makeItem('b', 'blocked'),
        makeItem('c', 'blocked'),
      ],
      summary: ['All blocked'],
    };
    const result = checkConsistency(report);
    expect(result.ok).toBe(false);
    expect(result.blockedCount).toBe(3);
  });

  test('preserves summary from report', () => {
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [makeItem('a', 'ok')],
      summary: ['Custom summary line'],
    };
    const result = checkConsistency(report);
    expect(result.summary).toEqual(['Custom summary line']);
  });

  test('handles mixed blocked and attention', () => {
    const report: ConsistencyReport = {
      generatedAt: new Date().toISOString(),
      items: [
        makeItem('a', 'blocked'),
        makeItem('b', 'attention'),
        makeItem('c', 'ok'),
        makeItem('d', 'blocked'),
      ],
      summary: ['Mixed'],
    };
    const result = checkConsistency(report);
    expect(result.ok).toBe(false);
    expect(result.blockedCount).toBe(2);
    expect(result.attentionCount).toBe(1);
  });
});
