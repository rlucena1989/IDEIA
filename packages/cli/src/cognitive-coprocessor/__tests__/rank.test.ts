import { rankPriorities } from '../rank';
import type { PriorityItem, PriorityWeights } from '../types';

function makeItem(id: string, urgency: number, impact: number, risk: number): PriorityItem {
  return { id, label: id, urgency, impact, risk };
}

describe('rankPriorities', () => {
  it('sorts items by score descending', () => {
    const items = [
      makeItem('low', 1, 1, 1),
      makeItem('high', 10, 10, 10),
      makeItem('mid', 5, 5, 5),
    ];
    const result = rankPriorities(items);
    expect(result.ranked[0].id).toBe('high');
    expect(result.ranked[1].id).toBe('mid');
    expect(result.ranked[2].id).toBe('low');
  });

  it('clamps score between 0 and 100', () => {
    const items = [makeItem('over', 1000, 1000, 1000)];
    const result = rankPriorities(items);
    expect(result.ranked[0].score).toBeLessThanOrEqual(100);
    expect(result.ranked[0].score).toBeGreaterThanOrEqual(0);
  });

  it('uses custom weights when provided', () => {
    const items = [makeItem('a', 10, 1, 1), makeItem('b', 1, 10, 1)];
    const weights: Partial<PriorityWeights> = { urgency: 1, impact: 0, risk: 0 };
    const result = rankPriorities(items, weights);
    expect(result.ranked[0].id).toBe('a');
  });

  it('falls back to default weights when weight sum is zero', () => {
    const items = [makeItem('a', 10, 1, 1)];
    const result = rankPriorities(items, { urgency: 0, impact: 0, risk: 0 });
    expect(result.ranked[0].score).toBeGreaterThan(0);
  });

  it('generates reasoning with top and bottom items', () => {
    const items = [makeItem('top', 10, 10, 10), makeItem('bottom', 1, 1, 1)];
    const result = rankPriorities(items);
    expect(result.reasoning).toContain('top');
    expect(result.reasoning).toContain('bottom');
  });

  it('handles single item', () => {
    const items = [makeItem('only', 5, 5, 5)];
    const result = rankPriorities(items);
    expect(result.ranked).toHaveLength(1);
    expect(result.ranked[0].score).toBeGreaterThan(0);
  });

  it('handles empty items array', () => {
    const result = rankPriorities([]);
    expect(result.ranked).toHaveLength(0);
    expect(result.reasoning).toBe('Nenhum item para ranquear.');
  });

  it('computes correct score for equal items', () => {
    const items = [makeItem('a', 5, 5, 5), makeItem('b', 5, 5, 5)];
    const result = rankPriorities(items);
    expect(result.ranked[0].score).toBe(result.ranked[1].score);
  });
});
