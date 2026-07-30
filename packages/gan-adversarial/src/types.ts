export interface PolicyResult {
  allowed: boolean;
  matchedPatterns: string[];
  riskScore: number;
}

export interface AttackScenario {
  payload: string;
  bypassed: boolean;
  timestamp: number;
  embedding: number[];
  attackType: string;
  severity: number;
  policyResult: PolicyResult;
}

export interface AttackLogEntry {
  scenario: AttackScenario;
  iteration: number;
  generatorId: string;
  discriminatorScores: number[];
}

export interface AttackMetrics {
  totalAttacks: number;
  attackSuccessRate: number;
  diversityScore: number;
  coverageByType: Record<string, number>;
  avgSeverity: number;
  robustnessScore: number;
}

export interface FeedbackMetrics {
  bypassRate: number;
  totalAttacks: number;
  dLoss: number;
  gLoss: number;
  defensesUpdated: boolean;
  diversityScore: number;
  attackTypeDistribution: Record<string, number>;
  ensembleConfidence: number;
  latencyMs: number;
}

export interface GANSystemConfig {
  wgan: {
    noiseDim: number;
    embedDim: number;
    conditionDim: number;
    learningRate: number;
    lambdaGp: number;
  };
  evolutionary: {
    populationSize: number;
    generations: number;
    eliteRatio: number;
    mutationRate: number;
    crossoverRate: number;
  };
  ensemble: {
    nModels: number;
    weightUpdateInterval: number;
  };
  feedback: {
    bypassThreshold: number;
    strengthenBatchSize: number;
    continuousIntervalMs: number;
  };
  detection: {
    collapseThreshold: number;
    collapseWindowSize: number;
  };
}

export const DEFAULT_GAN_CONFIG: GANSystemConfig = {
  wgan: { noiseDim: 128, embedDim: 768, conditionDim: 32, learningRate: 0.0001, lambdaGp: 10 },
  evolutionary: { populationSize: 10, generations: 100, eliteRatio: 0.3, mutationRate: 0.01, crossoverRate: 0.5 },
  ensemble: { nModels: 5, weightUpdateInterval: 100 },
  feedback: { bypassThreshold: 0.3, strengthenBatchSize: 64, continuousIntervalMs: 60000 },
  detection: { collapseThreshold: 0.3, collapseWindowSize: 5 },
};

export interface PolicyEngine {
  evaluate(input: { action: string; context: Record<string, unknown> }): Promise<PolicyResult>;
  addPattern(pattern: { pattern: string; type: string; severity: number }): Promise<void>;
  hasCoverage(type: string): boolean;
}

export interface GeneratorWeights {
  layer1: number[];
  layer2: number[];
  layer3: number[];
}
