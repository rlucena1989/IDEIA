import { describe, it, expect } from '@jest/globals';
import { prioritizeStrategy } from '../strategy-prioritizer';
import { RoadmapItem } from '../roadmap-types';

describe('strategy-prioritizer', () => {
  it('prioritizeStrategy should be defined', () => {
    expect(prioritizeStrategy).toBeDefined();
  });

  it('should boost priority on critical gaps', () => {
    const items: RoadmapItem[] = [
      { itemId: 'a', title: 'A', description: '', priority: 10, effort: 'small', risk: 'low', dependencies: [], value: 'high' },
    ];
    const gaps = [{ gapId: 'g1', category: 'functional' as const, description: 'Critical gap', severity: 'critical' as const }];
    const result = prioritizeStrategy(gaps, items);
    expect(result[0].priority).toBeGreaterThan(10);
  });

  it('should boost critical value items', () => {
    const items: RoadmapItem[] = [
      { itemId: 'a', title: 'Critical Value', description: '', priority: 10, effort: 'medium', risk: 'medium', dependencies: [], value: 'critical' },
      { itemId: 'b', title: 'Low Value', description: '', priority: 10, effort: 'small', risk: 'low', dependencies: [], value: 'low' },
    ];
    const result = prioritizeStrategy([], items);
    expect(result[0].title).toBe('Critical Value');
  });

  it('should sort by priority descending', () => {
    const items: RoadmapItem[] = [
      { itemId: 'a', title: 'Low', description: '', priority: 1, effort: 'small', risk: 'low', dependencies: [], value: 'low' },
      { itemId: 'b', title: 'High', description: '', priority: 20, effort: 'large', risk: 'high', dependencies: [], value: 'critical' },
    ];
    const result = prioritizeStrategy([], items);
    expect(result[0].title).toBe('High');
  });
});
