import { createLogger } from '@ideia/logger'
import { PlanningRequest, CostEstimate, BenefitAnalysis, HistoricalRecord } from './types'

const logger = createLogger('cost-benefit')

export class CostBenefitAnalyzer {
  private history: HistoricalRecord[] = []

  analyze(request: PlanningRequest): BenefitAnalysis {
    const cost = this.estimateCost(request)
    const roi = cost.execWithoutPlan > 0 ? Math.round(((cost.execWithoutPlan - cost.execWithPlan - cost.planTokens) / cost.planTokens) * 100) : 0
    const shouldPlan = roi > 20
    const confidence = request.historyAvailable ? 0.85 : 0.6

    logger.info(`Analysis complete`, { roi: `${roi}%`, shouldPlan, complexity: request.complexity })
    return {
      roi, shouldPlan, confidence,
      recommendedDepth: request.complexity > 0.7 ? 'detailed' : request.complexity > 0.4 ? 'moderate' : 'shallow',
      reasoning: roi > 20 ? `Planning ROI is ${roi}% (>20%), recommend planning` : `Planning ROI is ${roi}% (≤20%), execute directly`,
    }
  }

  estimateCost(request: PlanningRequest): CostEstimate {
    const planTokens = Math.round(request.contextSize * 0.3 + request.estimatedTokens * 0.2)
    const retryRate = request.historyAvailable ? this.averageRetryRate() : 0.3
    const execWithPlan = Math.round(request.estimatedTokens * (1 + retryRate * 0.3))
    const execWithoutPlan = Math.round(request.estimatedTokens * (1 + retryRate * 0.6))
    return { planTokens, execWithPlan, execWithoutPlan, retryRate, totalCost: planTokens + execWithPlan }
  }

  recordResult(record: HistoricalRecord): void {
    this.history.push(record)
    logger.info(`Record saved`, { taskId: record.taskId, success: record.success })
  }

  private averageRetryRate(): number {
    if (this.history.length === 0) return 0.3
    return this.history.filter(h => !h.success).length / this.history.length
  }
}
