export type FinetuningMethod = 'lora' | 'qlora' | 'full';
export type FinetuningStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface DatasetEntry {
  input: string;
  output: string;
  metadata: {
    source: string;
    timestamp: string;
    taskType: string;
  };
}

export interface Hyperparameters {
  learningRate: number;
  epochs: number;
  batchSize: number;
  rank?: number;
  alpha?: number;
  targetModules?: string[];
}

export interface TrainingMetrics {
  loss: number;
  accuracy: number;
  perplexity: number;
  evalScore: number;
  tokensProcessed: number;
  duration: number;
}

export interface FinetuningJob {
  id: string;
  model: string;
  method: FinetuningMethod;
  dataset: DatasetEntry[];
  hyperparameters: Hyperparameters;
  status: FinetuningStatus;
  metrics?: TrainingMetrics;
}

export interface ModelCheckpoint {
  path: string;
  step: number;
  metrics: TrainingMetrics;
  timestamp: string;
}

export interface EvaluationScores {
  bleu: number;
  codebleu: number;
  passAtK: number;
  humanEval: number;
}

export interface EvaluationResult {
  modelName: string;
  dataset: string;
  scores: EvaluationScores;
  comparison?: Record<string, EvaluationScores>;
}
