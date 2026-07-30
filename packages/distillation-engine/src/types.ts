export type DistillationMethod = 'logit' | 'reasoning-r1' | 'cross-tokenizer'

export type ProfessorProvider = 'anthropic' | 'openai' | 'deepseek' | 'google'

export interface ProfessorConfig {
  provider: ProfessorProvider
  model: string
  apiKey?: string
  maxTokens: number
  temperature: number
}

export interface DistillationSample {
  id: string
  prompt: string
  completion: string
  professorModel: string
  verified: boolean
  score?: number
  metadata: Record<string, unknown>
}

export interface DistillationDataset {
  id: string
  name: string
  professor: ProfessorConfig
  method: DistillationMethod
  samples: DistillationSample[]
  totalTokens: number
  estimatedCost: number
  quality: {
    verifiedRatio: number
    avgLength: number
    diversityScore: number
  }
}

export interface DistillationRunConfig {
  name: string
  professor: ProfessorConfig
  method: DistillationMethod
  student: StudentConfig
  filtering: FilterConfig
  outputPath: string
}

export interface StudentConfig {
  modelId: string
  method: 'qlora' | 'lora' | 'full'
  training: TrainingHyperparameters
}

export interface TrainingHyperparameters {
  epochs: number
  learningRate: number
  batchSize: number
  gradientAccumulationSteps: number
  bf16: boolean
}

export interface FilterConfig {
  strategy: 'correctness' | 'skill-aware' | 'difficulty' | 'diversity'
  minScore: number
  maxSamples: number
  verifyWith?: string
}

export interface DistillationReport {
  runId: string
  config: DistillationRunConfig
  datasetGenerated: number
  datasetAfterFilter: number
  trainingMetrics?: {
    trainLoss: number[]
    evalLoss: number[]
    perplexity: number
  }
  evaluation?: {
    mathScore?: number
    codeScore?: number
    reasoningScore?: number
  }
  status: 'pending' | 'generating' | 'filtering' | 'training' | 'evaluating' | 'completed' | 'failed'
  error?: string
}
