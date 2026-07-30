export interface QualityMetric { name: string; value: number; weight: number; threshold: number; timestamp: string }
export interface ThresholdConfig { metric: string; min: number; max: number; initial: number; adaptationRate: number }
export interface AdaptationResult { metric: string; oldThreshold: number; newThreshold: number; reason: string; confidence: number }
export interface DriftSignal { metric: string; currentAvg: number; baselineAvg: number; deviation: number; driftDetected: boolean }
