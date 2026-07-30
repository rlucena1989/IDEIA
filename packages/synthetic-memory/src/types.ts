export interface Memory {
  id: string;
  content: string;
  summary: string;
  abstraction?: string;
  importance: number;
  tags: string[];
  source: 'observation' | 'synthesis' | 'reflection' | 'gap_filler' | 'augmented';
  timestamp: number;
  level: 'L1' | 'L2' | 'L3' | 'L4';
  provenance: MemoryProvenance;
  embedding?: Float64Array;
  accessCount: number;
  lastAccessed: number;
  decayFactor: number;
}

export interface MemoryProvenance {
  originalSources: string[];
  synthesisMethod: 'direct' | 'llm' | 'template' | 'reflection' | 'gan';
  faithfulness: number;
}

export interface MemoryTemplate {
  id: string;
  name: string;
  description: string;
  contentPattern: string;
  tags: string[];
  importanceRange: [number, number];
  source: string;
}

export interface MemoryVariant {
  id: string;
  templateId: string;
  content: string;
  tags: string[];
  importance: number;
  timestamp: number;
  embedding?: Float64Array;
}

export interface ValidationResult {
  memoryId: string;
  passed: boolean;
  faithfulness: number;
  informationDensity: number;
  coherence: number;
  plausibility: number;
  issues: ValidationIssue[];
  score: number;
}

export interface ValidationIssue {
  type: 'faithfulness' | 'coherence' | 'redundancy' | 'plausibility' | 'density';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface GANConfig {
  latentDim: number;
  embeddingDim: number;
  generatorHiddenDim: number;
  discriminatorHiddenDim: number;
  batchSize: number;
  learningRate: number;
  epochs: number;
}

export interface GeneratorNetworkConfig {
  inputDim: number;
  hiddenDim: number;
  outputDim: number;
}

export interface DiscriminatorNetworkConfig {
  inputDim: number;
  hiddenDim: number;
}

export interface ContrastiveConfig {
  temperature: number;
  similarityTarget: number;
  margin: number;
  batchSize: number;
}

export interface DPConfig {
  epsilon: number;
  delta: number;
  sensitivity: number;
}

export interface AugmentationConfig {
  maxVariationsPerMemory: number;
  similarityThreshold: number;
  noiseStd: number;
  preserveSemantics: boolean;
}

export enum AugmentationStrategy {
  GaussianNoise = 'gaussian_noise',
  Interpolation = 'interpolation',
  Extrapolation = 'extrapolation',
  Mixup = 'mixup',
}

export interface TrainingMetrics {
  generatorLoss: number[];
  discriminatorLoss: number[];
  dpEpsilon: number;
  epochsCompleted: number;
}

export interface FidelityMetrics {
  mse: number;
  avgMinDistance: number;
  coverageScore: number;
  privacyLoss: number;
}

export interface MemorySample {
  id: string;
  embedding: Float64Array;
  metadata: Record<string, unknown>;
  isSynthetic: boolean;
}

export interface SynthesisConfig {
  mode: 'gan' | 'contrastive' | 'dp';
  latentDim: number;
  embeddingDim: number;
  epsilon: number;
  delta: number;
  batchSize: number;
  learningRate: number;
  epochs: number;
}
