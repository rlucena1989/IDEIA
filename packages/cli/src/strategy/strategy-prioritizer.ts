import { GapItem } from './gap-analyzer';
import { RoadmapItem } from './roadmap-types';

export function prioritizeStrategy(gaps: GapItem[], items: RoadmapItem[]): RoadmapItem[] {
  const gapRisk = gaps.some(g => g.severity === 'critical') ? 50 : 0;

  return [...items]
    .map(item => ({
      ...item,
      priority: item.priority + gapRisk + (item.value === 'critical' ? 20 : 0),
    }))
    .sort((a, b) => b.priority - a.priority);
}
