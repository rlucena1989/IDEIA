export interface AttackScenario {
  id: string;
  name: string;
  payload: string;
  target: string;
  tags: string[];
  parentId?: string;
  generation: number;
  fitness?: number;
  metadata: Record<string, unknown>;
}

export interface MutationStrategy {
  name: string;
  mutate(scenario: AttackScenario, intensity?: number): Promise<AttackScenario>;
}

export interface MutationOptions {
  strategies?: MutationStrategy[];
  count?: number;
  intensity?: number;
}

export interface MutationRecord {
  parentId: string;
  childId: string;
  strategy: string;
  intensity: number;
  fitness: number;
  timestamp: number;
}

export interface MutationStats {
  totalMutations: number;
  successRate: number;
  averageFitness: number;
  topStrategy: string;
  strategyBreakdown: Record<string, { count: number; avgFitness: number }>;
}

export interface EvolutionOptions {
  generations?: number;
  mutationRate?: number;
  crossoverRate?: number;
  onGeneration?: (gen: number, avgFitness: number, maxFitness: number, populationSize: number) => void;
}

export interface PopulationStats {
  size: number;
  avgFitness: number;
  maxFitness: number;
  minFitness: number;
  diversity: number;
}

export interface EvaluationResult {
  score: number;
  blocked: boolean;
  details: EvaluationDetails;
}

export interface EvaluationDetails {
  bypassTechnique?: string;
  injectionScore: number;
  bypassScore: number;
  stealthScore: number;
}

export interface StrategyStats {
  count: number;
  avgFitness: number;
  totalFitness: number;
}
