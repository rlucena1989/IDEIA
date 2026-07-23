import { ComplexityLevel, RoutePipeline, AgentRole } from './types';

const PIPELINES: Record<ComplexityLevel, RoutePipeline> = {
  N0: { level: 'N0', requiredAgents: [], requirePlan: false, requireVerification: false, requireApproval: false, parallelAgents: false, maxSteps: 1, tokenBudget: 500, stages: ['classify', 'respond'] },
  N1: { level: 'N1', requiredAgents: ['programmer'], requirePlan: false, requireVerification: false, requireApproval: false, parallelAgents: false, maxSteps: 3, tokenBudget: 2000, stages: ['classify', 'execute'] },
  N2: { level: 'N2', requiredAgents: ['analyst', 'programmer'], requirePlan: true, requireVerification: true, requireApproval: false, parallelAgents: false, maxSteps: 5, tokenBudget: 4000, stages: ['classify', 'plan', 'execute', 'verify', 'deliver'] },
  N3: { level: 'N3', requiredAgents: ['analyst', 'architect', 'programmer', 'tester'], requirePlan: true, requireVerification: true, requireApproval: false, parallelAgents: false, maxSteps: 8, tokenBudget: 8000, stages: ['classify', 'plan', 'execute', 'verify', 'repair', 'deliver'] },
  N4: { level: 'N4', requiredAgents: ['analyst', 'architect', 'programmer', 'tester', 'reviewer'], requirePlan: true, requireVerification: true, requireApproval: false, parallelAgents: true, maxSteps: 12, tokenBudget: 15000, stages: ['classify', 'plan', 'execute_parallel', 'verify', 'repair', 'merge', 'deliver'] },
  N5: { level: 'N5', requiredAgents: ['analyst', 'architect', 'programmer', 'tester', 'reviewer', 'devops', 'supervisor'], requirePlan: true, requireVerification: true, requireApproval: true, parallelAgents: true, maxSteps: 20, tokenBudget: 25000, stages: ['classify', 'plan', 'approve', 'execute_parallel', 'verify', 'repair', 'merge', 'deliver'] },
};

export class RouteSelector {
  select(level: ComplexityLevel): RoutePipeline {
    return { ...PIPELINES[level] };
  }

  getRequiredAgents(level: ComplexityLevel): AgentRole[] {
    return [...PIPELINES[level].requiredAgents];
  }

  getTokenBudget(level: ComplexityLevel): number {
    return PIPELINES[level].tokenBudget;
  }

  getAllPipelines(): Record<ComplexityLevel, RoutePipeline> {
    return Object.fromEntries(
      Object.entries(PIPELINES).map(([k, v]) => [k, { ...v }]),
    ) as Record<ComplexityLevel, RoutePipeline>;
  }
}
