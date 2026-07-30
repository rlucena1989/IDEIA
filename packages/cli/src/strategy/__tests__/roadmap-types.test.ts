import { describe, it, expect } from '@jest/globals';
import { RoadmapItem, Roadmap } from '../roadmap-types';

describe('roadmap-types', () => {
  it('should create a valid RoadmapItem', () => {
    const item: RoadmapItem = {
      itemId: 'i1',
      title: 'Add auth',
      description: 'Implement authentication',
      priority: 10,
      effort: 'medium',
      risk: 'medium',
      dependencies: ['i0'],
      value: 'high',
    };
    expect(item.itemId).toBe('i1');
    expect(item.priority).toBe(10);
  });

  it('should support all effort values', () => {
    for (const effort of ['small', 'medium', 'large'] as const) {
      const item: RoadmapItem = {
        itemId: `i-${effort}`, title: '', description: '', priority: 0,
        effort, risk: 'low', dependencies: [], value: 'low',
      };
      expect(item.effort).toBe(effort);
    }
  });

  it('should support all risk values', () => {
    for (const risk of ['low', 'medium', 'high', 'critical'] as const) {
      const item: RoadmapItem = {
        itemId: `i-${risk}`, title: '', description: '', priority: 0,
        effort: 'small', risk, dependencies: [], value: 'low',
      };
      expect(item.risk).toBe(risk);
    }
  });

  it('should support all value levels', () => {
    for (const value of ['low', 'medium', 'high', 'critical'] as const) {
      const item: RoadmapItem = {
        itemId: `i-${value}`, title: '', description: '', priority: 0,
        effort: 'small', risk: 'low', dependencies: [], value,
      };
      expect(item.value).toBe(value);
    }
  });

  it('should create a valid Roadmap', () => {
    const roadmap: Roadmap = {
      roadmapId: 'rm-1',
      createdAt: new Date().toISOString(),
      targetId: 'target-1',
      items: [],
    };
    expect(roadmap.items).toEqual([]);
  });

  it('should accept items in roadmap', () => {
    const item: RoadmapItem = {
      itemId: 'i1', title: 'Task', description: '', priority: 5,
      effort: 'small', risk: 'low', dependencies: [], value: 'medium',
    };
    const roadmap: Roadmap = {
      roadmapId: 'rm-2', createdAt: '', targetId: 't1',
      items: [item],
    };
    expect(roadmap.items).toHaveLength(1);
  });
});
