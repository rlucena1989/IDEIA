import { describe, it, expect } from '@jest/globals';
import { buildRoadmap } from '../roadmap-builder';
import { createTargetState } from '../target-state';
import { RoadmapItem } from '../roadmap-types';

describe('roadmap-builder', () => {
  it('buildRoadmap should be defined', () => {
    expect(buildRoadmap).toBeDefined();
  });

  it('should sort items by priority descending', () => {
    const target = createTargetState({ name: 'Test', description: '' });
    const items: RoadmapItem[] = [
      { itemId: 'a', title: 'Low', description: '', priority: 1, effort: 'small', risk: 'low', dependencies: [], value: 'low' },
      { itemId: 'b', title: 'High', description: '', priority: 10, effort: 'large', risk: 'high', dependencies: [], value: 'high' },
    ];
    const roadmap = buildRoadmap(target, items);
    expect(roadmap.items[0].title).toBe('High');
    expect(roadmap.items[1].title).toBe('Low');
  });

  it('should link roadmap to target', () => {
    const target = createTargetState({ name: 'MyTarget', description: '' });
    const roadmap = buildRoadmap(target, []);
    expect(roadmap.targetId).toBe(target.targetId);
    expect(roadmap.roadmapId).toContain(target.targetId);
  });
});
