import { PlannedStep, RiskLevel } from './types';
import { createLogger } from '@ideia/logger';

export class FallbackPlanner {
  generateFallback(step: PlannedStep): PlannedStep[] {
    if (step.risk.level === 'low' || step.risk.level === 'medium') {
      return [];
    }

    const fallbacks: PlannedStep[] = [];
    const _originalRole = step.agentRole;

    if (step.risk.level === 'high') {
      fallbacks.push({
        ...step,
        id: `${step.id}_fb_simple`,
        title: `${step.title} (versão simplificada)`,
        description: `Versão reduzida de: ${step.description}`,
        risk: { ...step.risk, level: 'medium', probability: step.risk.probability * 0.5 },
        cost: { ...step.cost, estimatedTokens: Math.round(step.cost.estimatedTokens * 0.6) },
        tags: [...step.tags, 'fallback', 'simplified'],
      });
    }

    if (step.risk.level === 'critical') {
      fallbacks.push({
        ...step,
        id: `${step.id}_fb_review`,
        title: `${step.title} (com revisão)`,
        description: `Step com revisão obrigatória: ${step.description}`,
        agentRole: 'reviewer',
        risk: { ...step.risk, level: 'medium', mitigation: 'Revisão obrigatória antes de executar' },
        tags: [...step.tags, 'fallback', 'requires-review'],
      });

      fallbacks.push({
        ...step,
        id: `${step.id}_fb_split`,
        title: `${step.title} (dividido)`,
        description: `Step dividido em partes menores: ${step.description}`,
        risk: { ...step.risk, level: 'medium', probability: step.risk.probability * 0.4 },
        tags: [...step.tags, 'fallback', 'split'],
      });
    }

    return fallbacks;
  }
}
