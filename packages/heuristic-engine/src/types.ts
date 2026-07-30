export type ComplexityLevel = 'trivial' | 'simple' | 'moderate' | 'complex' | 'critical';

export type PriorityStrategy = 'moscow' | 'eisenhower' | 'wsjf' | 'risk-adjusted';

export interface Task {
  id: string;
  type: string;
  name: string;
  description: string;
  riskScore: number;
  urgency: number;
  impact: number;
  effort: number;
  dependencies: number;
  files: string[];
  integrations: string[];
  ambiguityLevel: number;
  requiresADR: boolean;
}

export interface PrioritizedTask {
  task: Task;
  score: number;
  priority: 'must' | 'should' | 'could' | 'wont';
  rationale: string;
}

export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  currentLoad: number;
  maxLoad: number;
  taskHistory: Array<{ type: string; success: boolean }>;
}

export interface PipelineRoute {
  pipeline: 'rule-only' | 'llm-light' | 'llm-plan-execute' | 'multi-agent' | 'multi-agent-review';
  expectedTokens: number;
  agents: number;
}

export interface DecisionOption<T> {
  id: string;
  label: string;
  value: T;
  score: number;
  risks: string[];
  benefits: string[];
}

export interface DecisionResult<T> {
  selected: DecisionOption<T>;
  alternatives: DecisionOption<T>[];
  confidence: number;
  rationale: string;
}

export interface SearchSpace<T> {
  generateRandom: () => T;
  mutate: (individual: T, rate: number) => T;
  crossover: (a: T, b: T) => T;
  fitness: (individual: T) => number;
}

export interface FuzzyRule {
  condition: Record<string, { min?: number; max?: number }>;
  output: string;
  confidence: number;
}

export interface ExpertRule {
  id: string;
  condition: string;
  actions: string[];
  priority: number;
  category: string;
}
