export type DecompositionStrategy = 'top-down' | 'bottom-up' | 'hybrid' | 'example-based' | 'agile' | 'waterfall';

export interface Goal {
  description: string;
  complexity: number;
  fileCount?: number;
  stepCount?: number;
  domain: string;
  constraints: string[];
  successCriteria: string[];
  id?: string;
  title?: string;
  objectives?: string[];
}

export interface PlanningContext {
  fileCount: number;
  agentSkillLevel: number;
  similarProjects: number;
  hasExistingCode: boolean;
  isBugfix: boolean;
  isRefactor: boolean;
  timeEstimate: number;
  historyLength: number;
  teamSize: number;
  deadline?: Date;
  techStack: string[];
  hasExamples: boolean;
  hasSimilarTasks: boolean;
  hasArchitecturalGuidance: boolean;
  hasConstraints: boolean;
  hasRiskAssessment: boolean;
}

export interface Example {
  goal: Goal;
  preferredStrategy: DecompositionStrategy;
  outcome: { success: boolean; tokensSpent: number; stepsExecuted: number };
}

export interface Task {
  id: string;
  goal?: Goal;
  context?: PlanningContext;
  expectedSteps?: number;
  optimalStrategy?: DecompositionStrategy;
  groundTruth?: PlanStep[];
  metadata?: { source: 'human' | 'synthetic' | 'historical'; qualityScore: number; timestamp: number; taskEmbedding?: Float32Array };
  domain: string;
  type: string;
  description: string;
  acceptanceCriteria: string[];
  dependencies: string[];
  technicalNotes: string;
  files: string[];
}

export interface PlanStep {
  description: string;
  estimatedTokens: number;
  estimatedTime: number;
  dependencies: string[];
  subSteps?: PlanStep[];
}

export interface TaskFamily {
  id: string;
  name: string;
  domain: string;
  supportSet?: Task[];
  querySet?: Task[];
  similarityThreshold?: number;
  metaFeatures?: Record<string, number>;
  curriculumOrder?: number;
  featureVector?: Float32Array;
  description: string;
  tasks?: Task[];
}

export interface MetaParams {
  weights: Record<string, number>;
  biases?: Float32Array[];
  adamSteps?: number;
  learningRate?: number;
  strategies: string[];
  adaptationRate: number;
  explorationRate: number;
}

export interface TaskSpecificParams {
  weights?: Float32Array[];
  biases?: Float32Array[];
  innerSteps?: number;
  finalLoss?: number;
  strategy: string;
  complexity: number;
  iterations: number;
  confidence: number;
  convergenceRate: number;
  reward: number;
}

export interface MetaMetrics {
  initialLoss?: number;
  finalLoss?: number;
  accuracy: number;
  convergenceEpoch?: number;
  adaptationTimeMs?: number;
  forgettingRate?: number;
  crossDomainTransfer?: number;
  iteration: number;
  loss: number;
  adaptationSpeed: number;
  generalizationGap: number;
  transferEfficiency: number;
  taskCount: number;
  completedTasks: number;
  timestamp: number;
}

export interface MAMLConfig {
  innerLR: number;
  outerLR: number;
  innerSteps?: number;
  metaBatchSize: number;
  fomaml?: boolean;
  gradientClip?: number;
  weightDecay?: number;
  inputDim?: number;
  hiddenDims?: number[];
  outputDim?: number;
  adaptationSteps: number;
  maxTrainingTasks: number;
  convergenceThreshold: number;
  taskSimilarityThreshold: number;
  explorationRate: number;
}

export interface MetaPolicy {
  parameters: Float32Array[];
  forward(input: Float32Array): Float32Array;
  clone(): MetaPolicy;
  save(): PolicySnapshot;
  load(snapshot: PolicySnapshot): void;
}

export interface PolicySnapshot {
  weights: Float32Array[];
  biases: Float32Array[];
}

export interface TaskPolicy {
  parameters: Float32Array[];
  forward(state: Float32Array): Float32Array;
  hiddenState?: Float32Array;
}

export interface Episode { states: Float32Array[]; actions: number[]; rewards: number[]; dones: boolean[]; totalReward: number }
export interface Reward { value: number; discount: number }

export interface MetaRLConfig {
  inputDim: number; hiddenDim: number; actionDim: number; hiddenUnits: number;
  metaLR: number; innerLR: number; outerLR: number; gamma: number; clipEpsilon: number; epochs: number;
}

export interface LatentContext { mean: Float32Array; logVar: Float32Array; sample(): Float32Array }

export interface PEARLConfig {
  stateDim: number; actionDim: number; latentDim: number; hiddenDim: number;
  contextEncoderHidden: number[]; actorHidden: number[]; criticHidden: number[];
  lrActor: number; lrCritic: number; lrEncoder: number; gamma: number; tau: number;
  batchSize: number; replaySize: number;
}

export interface BeliefState { mean: Float32Array; logVar: Float32Array; sample(): Float32Array; klDivergence(): number }

export interface VAEParams {
  encoderWeights: Float32Array[]; encoderBiases: Float32Array[]; decoderWeights: Float32Array[];
  decoderBiases: Float32Array[]; latentDim: number;
}

export interface VariBADConfig {
  stateDim: number; actionDim: number; latentDim: number; hiddenDim: number;
  encoderHidden: number[]; decoderHidden: number[]; plannerHidden: number[];
  lrEncoder: number; lrDecoder: number; lrPlanner: number; klBeta: number; horizon: number; planSamples: number;
}

export interface ReplaySample {
  familyId: string;
  supportIds: string[];
  adaptedPolicy: TaskPolicy | null;
  queryLoss: number;
  timestamp: number;
  importance?: number;
  domain?: string;
  taskCount?: number;
  metrics?: { success?: boolean; executionTime?: number; reward?: number; adaptations?: number };
}

export interface AdaptationResult {
  success: boolean; adaptationTimeMs: number; finalLoss: number; adaptedPolicy: TaskPolicy;
  replaySamplesUsed: number; innerEpochsUsed: number; crossProjectBoost: boolean;
}

export interface EvaluationReport {
  currentLoss?: number;
  accuracy?: number;
  averageLoss?: number;
  driftDetected?: boolean;
  driftMagnitude?: number;
  recommendation?: 'stable' | 'retrain' | 'adapt';
  overallAccuracy: number;
  generalizationScore: number;
  adaptationEfficiency: number;
  perTaskResults: Array<{ taskId: string; accuracy: number; confidence: number }>;
  recommendations: string[];
  metaMetrics?: MetaMetrics;
}

export interface MetaLearningResult {
  initialLoss?: number;
  finalLoss?: number;
  innerSteps?: number;
  convergenceEpoch?: number;
  adaptationTime?: number;
  policySnapshot?: PolicySnapshot;
  taskFamiliesProcessed?: number;
  curriculumPhase?: number;
  crossProjectTransfers?: number;
  success: boolean;
  strategy: string;
  confidence: number;
  adaptations: number;
  metrics: { adaptationSpeed: number; transferEfficiency: number; generalizationGap: number };
  recommendations: string[];
}

export interface ProjectMemory {
  projectId: string; domain: string; taskCount: number; avgComplexity: number;
  dominantStrategies: Map<DecompositionStrategy, number>;
  policySnapshot: PolicySnapshot;
  performance: { avgLoss: number; accuracy: number; adaptationSpeed: number };
  timestamp: number;
  completedTasks: Task[];
}

export interface Transition { state: Float32Array; action: number; reward: number; nextState: Float32Array; done: boolean }
export interface Trajectory { states: Float32Array[]; actions: number[]; rewards: number[]; nextStates: Float32Array[]; dones: boolean[] }