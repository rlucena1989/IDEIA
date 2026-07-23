import { PlannedStep, Plan, DecompositionStrategy } from './types';
import { AdaptiveDecomposer } from './decomposer';

export class DynamicReplanner {
  private decomposer: AdaptiveDecomposer;

  constructor() {
    this.decomposer = new AdaptiveDecomposer();
  }

  replanAfterFailure(failedStep: PlannedStep, remainingSteps: PlannedStep[], _originalGoal: string): PlannedStep[] {
    const newSteps: PlannedStep[] = [];

    for (const step of remainingSteps) {
      if (step.id === failedStep.id) {

        const fallback = step.fallbackPlan ?? [];
        if (fallback.length > 0) {
          newSteps.push(...fallback.map(fb => ({ ...fb, status: 'pending' as const })));
        } else {

          const decomposed = this.decomposer.decompose(
            `Corrigir: ${step.description}`,
            'top_down',
          );
          newSteps.push(...decomposed.steps.map(s => ({
            ...s,
            id: `${s.id}_replan`,
            dependencies: [{ stepId: s.id, type: 'requires' as const }],
            status: 'pending' as const,
            tags: [...s.tags, 'replanned'],
          })));
        }
      } else {

        newSteps.push({ ...step, status: 'pending' });
      }
    }

    return newSteps;
  }

  suggestScopeReduction(failedStep: PlannedStep, _originalPlan: Plan): { suggestion: string; reducedSteps: PlannedStep[] } {
    const reduced = {
      ...failedStep,
      description: `${failedStep.description} [ESCOPO REDUZIDO]`,
      cost: { ...failedStep.cost, estimatedTokens: Math.round(failedStep.cost.estimatedTokens * 0.5) },
      acceptanceCriteria: failedStep.acceptanceCriteria.filter(c => c.mandatory),
      tags: [...failedStep.tags, 'scope-reduced'],
    };

    return {
      suggestion: `Step "${failedStep.title}" teve escopo reduzido para apenas critérios obrigatórios. Custo estimado caiu ${failedStep.cost.estimatedTokens} → ${reduced.cost.estimatedTokens} tokens.`,
      reducedSteps: [reduced],
    };
  }
}
