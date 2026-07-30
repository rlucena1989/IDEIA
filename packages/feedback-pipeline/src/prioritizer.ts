import type { FeedbackEntry } from './types';
import { createLogger } from '@ideia/logger';
import type { ClassificationResult } from './classifier';
const logger = createLogger('prioritizer');

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type ImpactLevel = 1 | 2 | 3 | 4;
export type EffortLevel = 1 | 2 | 3 | 4;

export interface PriorityMatrixEntry {
  impact: ImpactLevel;
  effort: EffortLevel;
  priority: Priority;
}

export interface PrioritizedItem {
  feedback: FeedbackEntry;
  classification?: ClassificationResult;
  impact: ImpactLevel;
  effort: EffortLevel;
  priority: Priority;
}

const MATRIX: PriorityMatrixEntry[][] = [
  [{ impact: 4, effort: 1, priority: 'critical' }, { impact: 4, effort: 2, priority: 'critical' }, { impact: 4, effort: 3, priority: 'high' }, { impact: 4, effort: 4, priority: 'high' }],
  [{ impact: 3, effort: 1, priority: 'high' }, { impact: 3, effort: 2, priority: 'high' }, { impact: 3, effort: 3, priority: 'medium' }, { impact: 3, effort: 4, priority: 'medium' }],
  [{ impact: 2, effort: 1, priority: 'medium' }, { impact: 2, effort: 2, priority: 'medium' }, { impact: 2, effort: 3, priority: 'low' }, { impact: 2, effort: 4, priority: 'low' }],
  [{ impact: 1, effort: 1, priority: 'low' }, { impact: 1, effort: 2, priority: 'low' }, { impact: 1, effort: 3, priority: 'low' }, { impact: 1, effort: 4, priority: 'low' }],
];

const IMPACT_MAP: Record<string, ImpactLevel> = {
  critical: 4, error: 3, warning: 2, info: 1,
  bug: 4, feature: 3, improvement: 2, question: 1,
};

function estimateImpact(entry: FeedbackEntry, classification?: ClassificationResult): ImpactLevel {
  const severityImpact = IMPACT_MAP[entry.severity];
  if (classification) {
    const catImpact = IMPACT_MAP[classification.category];
    if (catImpact) return Math.max(severityImpact ?? 1, catImpact) as ImpactLevel;
  }
  return (severityImpact ?? 2) as ImpactLevel;
}

function estimateEffort(entry: FeedbackEntry): EffortLevel {
  const length = entry.content.length;
  if (length > 500) return 4;
  if (length > 200) return 3;
  if (length > 50) return 2;
  return 1;
}

export class FeedbackPrioritizer {
  prioritize(items: Array<{ feedback: FeedbackEntry; classification?: ClassificationResult }>): PrioritizedItem[] {
    return items.map(item => {
      const impact = estimateImpact(item.feedback, item.classification);
      const effort = estimateEffort(item.feedback);
      const priority = MATRIX[4 - impact][effort - 1].priority;
      return { feedback: item.feedback, classification: item.classification, impact, effort, priority };
    });
  }

  getMatrix(): PriorityMatrixEntry[][] {
    return MATRIX;
  }
}
