import { Roadmap, RoadmapItem } from './roadmap-types';
import { TargetState } from './target-state';

export function buildRoadmap(target: TargetState, items: RoadmapItem[]): Roadmap {
  return {
    roadmapId: `roadmap-${target.targetId}`,
    createdAt: new Date().toISOString(),
    targetId: target.targetId,
    items: [...items].sort((a, b) => b.priority - a.priority),
  };
}
