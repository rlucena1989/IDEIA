import { InnovationInitiative } from './innovation-tracker';
import { createLogger } from '@ideia/logger';
const logger = createLogger('priority-scorer');

export interface ScoredInitiative extends InnovationInitiative {
  urgencyScore: number;
  feasibilityScore: number;
  businessValueScore: number;
  totalScore: number;
}

export class PriorityScorer {
  score(initiative: InnovationInitiative): ScoredInitiative {
    const urgencyScore = Math.min(initiative.priority * 20, 100);
    const feasibilityScore = initiative.effort > 0 ? Math.max(10, 100 - (initiative.effort / 200) * 100) : 50;
    const businessValueScore = Math.min(initiative.impact * 25, 100);
    const totalScore = Math.round((urgencyScore * 0.4 + feasibilityScore * 0.3 + businessValueScore * 0.3));

    return { ...initiative, urgencyScore, feasibilityScore, businessValueScore, totalScore };
  }

  scoreBatch(initiatives: InnovationInitiative[]): ScoredInitiative[] {
    return initiatives.map(i => this.score(i)).sort((a, b) => b.totalScore - a.totalScore);
  }

  getTop(initiatives: InnovationInitiative[], n: number): ScoredInitiative[] {
    return this.scoreBatch(initiatives).slice(0, n);
  }
}
