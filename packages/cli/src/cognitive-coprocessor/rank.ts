import type { RankOutput, PriorityItem, PriorityWeights, RankedItem } from './types';
import { createLogger } from '@ideia/logger';
import { DEFAULT_PRIORITY_WEIGHTS } from './types';
const logger = createLogger('rank');

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function buildReasoning(items: RankedItem[]): string {
  if (items.length === 0) return 'Nenhum item para ranquear.';
  const top = items[0];
  const parts: string[] = [`Item de maior prioridade: "${top.label}" (score ${top.score})`];
  parts.push(`Fatores: urgência=${top.urgency}, impacto=${top.impact}, risco=${top.risk}`);
  if (items.length > 1) {
    const last = items[items.length - 1];
    parts.push(`Item de menor prioridade: "${last.label}" (score ${last.score})`);
  }
  return parts.join('. ');
}

/**
 * Processa priorities.
 * @param items - Valor items.
 * @param weights - Valor weights.
 * @returns O resultado da operação.
 */
export function rankPriorities(items: PriorityItem[], weights?: Partial<PriorityWeights>): RankOutput {
  const w: PriorityWeights = { ...DEFAULT_PRIORITY_WEIGHTS, ...weights };
  const weightSum = w.urgency + w.impact + w.risk;
  const normalized = weightSum > 0 ? w : DEFAULT_PRIORITY_WEIGHTS;

  const scored: RankedItem[] = items.map(item => {
    const score = clampScore(
      (item.urgency * normalized.urgency + item.impact * normalized.impact + item.risk * normalized.risk) /
      (normalized.urgency + normalized.impact + normalized.risk) * 25
    );
    return { ...item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    ranked: scored,
    reasoning: buildReasoning(scored),
  };
}
