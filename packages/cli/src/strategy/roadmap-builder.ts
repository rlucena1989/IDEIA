import { Roadmap, RoadmapItem } from './roadmap-types';
import { createLogger } from '@ideia/logger';
import { TargetState } from './target-state';
const logger = createLogger('roadmap-builder');

export function buildRoadmap(target: TargetState, items: RoadmapItem[]): Roadmap {
  return {
    roadmapId: `roadmap-${target.targetId}`,
    createdAt: new Date().toISOString(),
    targetId: target.targetId,
    items: [...items].sort((a, b) => b.priority - a.priority),
  };
}
