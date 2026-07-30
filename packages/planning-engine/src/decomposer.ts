import { PlannedStep, Plan, DecompositionStrategy, RiskAssessment, CostEstimate } from './types';
import { createLogger } from '@ideia/logger';

export interface DecomposerConfig {
  maxSteps: number;
  defaultRisk: RiskAssessment;
  defaultCost: CostEstimate;
}

const DEFAULT_CONFIG: DecomposerConfig = {
  maxSteps: 10,
  defaultRisk: { level: 'low', impact: 0.2, probability: 0.2, factors: ['default'], mitigation: 'N/A' },
  defaultCost: { estimatedTokens: 500, estimatedSeconds: 60, estimatedSteps: 1, confidence: 0.5 },
};

export class AdaptiveDecomposer {
  private config: DecomposerConfig;

  constructor(config?: Partial<DecomposerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  decompose(goal: string, strategy: DecompositionStrategy = 'hybrid'): { steps: PlannedStep[]; strategy: DecompositionStrategy } {
    switch (strategy) {
      case 'top_down':
        return { steps: this.topDown(goal), strategy };
      case 'bottom_up':
        return { steps: this.bottomUp(goal), strategy };
      case 'hybrid':
      default:
        return { steps: this.hybrid(goal), strategy };
    }
  }

  private topDown(goal: string): PlannedStep[] {
    const steps: PlannedStep[] = [];
    const phases = this.identifyPhases(goal);

    for (let i = 0; i < Math.min(phases.length, this.config.maxSteps); i++) {
      steps.push(this.makeStep(phases[i].title, phases[i].desc, phases[i].role, i > 0 ? [{ stepId: `step_${i}`, type: 'requires' }] : []));
    }

    if (steps.length === 0) {
      steps.push(this.makeStep('Analisar', `Analisar requisitos: ${goal}`, 'analyst', []));
      steps.push(this.makeStep('Planejar', `Planejar solução: ${goal}`, 'architect', [{ stepId: 'step_1', type: 'requires' }]));
      steps.push(this.makeStep('Executar', `Implementar solução: ${goal}`, 'programmer', [{ stepId: 'step_2', type: 'requires' }]));
    }

    return steps;
  }

  private bottomUp(goal: string): PlannedStep[] {
    const steps: PlannedStep[] = [];
    const tasks = this.identifyTasks(goal);

    for (let i = 0; i < Math.min(tasks.length, this.config.maxSteps); i++) {
      steps.push(this.makeStep(tasks[i].title, tasks[i].desc, tasks[i].role, []));
    }

    if (steps.length === 0) {
      steps.push(this.makeStep('Implementar', `Implementar: ${goal}`, 'programmer', []));
    }

    for (let i = 1; i < steps.length; i++) {
      if (steps[i].agentRole === steps[i - 1].agentRole) {
        steps[i] = {
          ...steps[i],
          dependencies: [...steps[i].dependencies, { stepId: steps[i - 1].id, type: 'requires' }],
        };
      }
    }

    return steps;
  }

  private hybrid(goal: string): PlannedStep[] {
    const tdSteps = this.topDown(goal);
    const buSteps = this.bottomUp(goal);

    const merged = this.mergePlans(tdSteps, buSteps);
    return merged.slice(0, this.config.maxSteps);
  }

  private mergePlans(topDown: PlannedStep[], bottomUp: PlannedStep[]): PlannedStep[] {
    const seen = new Set<string>();
    const merged: PlannedStep[] = [];

    for (const step of [...topDown, ...bottomUp]) {
      const key = `${step.agentRole}:${step.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(step);
      }
    }

    return merged;
  }

  private makeStep(title: string, description: string, role: string, deps: { stepId: string; type: 'requires' | 'blocked_by' | 'optional' | 'parallel_with' }[]): PlannedStep {
    const stepNum = `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    return {
      id: stepNum,
      title,
      description,
      agentRole: role,
      status: 'pending',
      dependencies: deps,
      acceptanceCriteria: this.defaultCriteria(title),
      risk: { ...this.config.defaultRisk },
      cost: { ...this.config.defaultCost },
      tags: [role, title.toLowerCase().replace(/\s+/g, '-')],
    };
  }

  private identifyPhases(goal: string): Array<{ title: string; desc: string; role: string }> {
    const lower = goal.toLowerCase();
    const phases: Array<{ title: string; desc: string; role: string }> = [];

    if (/analys|entend|requisit|understand|review/i.test(lower)) {
      phases.push({ title: 'Análise de requisitos', desc: `Analisar e entender: ${goal}`, role: 'analyst' });
    }
    if (/arquitet|design|architect|estrutur/i.test(lower)) {
      phases.push({ title: 'Arquitetura', desc: `Definir arquitetura para: ${goal}`, role: 'architect' });
    }
    if (/implement|criar|desenvolver|code|program|dev/i.test(lower)) {
      phases.push({ title: 'Implementação', desc: `Implementar: ${goal}`, role: 'programmer' });
    }
    if (/test|verif|valid/i.test(lower)) {
      phases.push({ title: 'Testes', desc: `Testar: ${goal}`, role: 'tester' });
    }
    if (/deploy|release|publicar/i.test(lower)) {
      phases.push({ title: 'Deploy', desc: `Fazer deploy de: ${goal}`, role: 'devops' });
    }

    return phases;
  }

  private identifyTasks(goal: string): Array<{ title: string; desc: string; role: string }> {
    return goal
      .split(/[.\n;,!]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .map(s => {
        const lower = s.toLowerCase();
        let role = 'programmer';
        if (/analys|entend|requisit/i.test(lower)) role = 'analyst';
        else if (/arquitet|design|architect/i.test(lower)) role = 'architect';
        else if (/test|verif|valid/i.test(lower)) role = 'tester';
        else if (/deploy|release/i.test(lower)) role = 'devops';
        return { title: s.slice(0, 50), desc: s, role };
      });
  }

  private defaultCriteria(title: string): import('./types').AcceptanceCriteria[] {
    return [
      { description: `${title} implementado corretamente`, verificationType: 'test', mandatory: true },
      { description: `${title} sem regressões`, verificationType: 'test', mandatory: true },
    ];
  }
}
