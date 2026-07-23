import { Roadmap } from './roadmap-types';
import { GapItem } from './gap-analyzer';

export interface EvolutionPlan {
  roadmap: Roadmap;
  gaps: GapItem[];
  nextActions: string[];
}

export function buildEvolutionPlan(roadmap: Roadmap, gaps: GapItem[]): EvolutionPlan {
  return {
    roadmap,
    gaps,
    nextActions: gaps.map(gap => `Resolve ${gap.description}`),
  };
}
