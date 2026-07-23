import { TargetState } from './target-state';
import { Roadmap } from './roadmap-types';
import { GapItem } from './gap-analyzer';
import { EvolutionPlan } from './evolution-roadmap';

export interface StrategyReport {
  generatedAt: string;
  target: TargetState;
  gaps: GapItem[];
  roadmap: Roadmap;
  evolution: EvolutionPlan;
  summary: string[];
}

export function buildStrategyReport(params: {
  target: TargetState;
  gaps: GapItem[];
  roadmap: Roadmap;
  evolution: EvolutionPlan;
}): StrategyReport {
  const summary: string[] = [
    `Alvo: ${params.target.name}`,
    `${params.gaps.length} gap(s) identificado(s)`,
    `${params.roadmap.items.length} item(ns) no roadmap`,
    `${params.evolution.nextActions.length} próxima(s) ação(ões)`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    summary,
  };
}
