export interface PlanningRequest { taskDescription: string; complexity: number; estimatedTokens: number; contextSize: number; historyAvailable: boolean }
export interface CostEstimate { planTokens: number; execWithPlan: number; execWithoutPlan: number; retryRate: number; totalCost: number }
export interface BenefitAnalysis { roi: number; shouldPlan: boolean; confidence: number; recommendedDepth: string; reasoning: string }
export interface HistoricalRecord { taskId: string; complexity: number; planned: boolean; durationMs: number; retries: number; success: boolean }
