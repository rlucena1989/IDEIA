import { RiskQuantification } from './types'
import { createLogger } from '@ideia/logger';
import { BayesianRiskNetwork } from './bayesian-risk-network'
import { VariableEliminationEngine } from './variable-elimination'
const logger = createLogger('risk-quantifier');

export class RiskQuantifier {
  quantify(
    riskDistribution: Record<string, number>,
    lossMapping: Record<string, number>,
    confidenceLevel: number = 0.95
  ): RiskQuantification {
    const pairs = Object.entries(riskDistribution)
      .map(([state, prob]) => ({
        loss: lossMapping[state] ?? 0,
        prob,
      }))
      .sort((a, b) => a.loss - b.loss)

    const expectedLoss = pairs.reduce((sum, p) => sum + p.loss * p.prob, 0)
    const probOfFailure = pairs.reduce(
      (sum, p) => sum + (p.loss > 0 ? p.prob : 0),
      0
    )

    let cum = 0
    let varLoss = pairs[pairs.length - 1]?.loss ?? 0
    let cvarSum = 0
    let cvarCount = 0
    for (const p of pairs) {
      cum += p.prob
      if (cum >= confidenceLevel) {
        varLoss = p.loss
        break
      }
    }
    for (const p of pairs) {
      if (p.loss >= varLoss) {
        cvarSum += p.loss * p.prob
        cvarCount += p.prob
      }
    }
    return {
      probabilityOfFailure: probOfFailure,
      expectedLoss,
      valueAtRisk: varLoss,
      conditionalVaR: cvarCount > 0 ? cvarSum / cvarCount : 0,
      confidenceLevel,
      lossDistribution: pairs.map(p => p.loss),
      tailRisk: varLoss > 0 ? (cvarSum / cvarCount) / varLoss : 0,
    }
  }

  computeLossDistribution(
    network: BayesianRiskNetwork,
    engine: VariableEliminationEngine,
    evidence: Record<string, string>,
    lossMapping: Record<string, Record<string, number>>
  ): RiskQuantification {
    return this.quantify(
      engine.infer(evidence, 'risk_level'),
      lossMapping['risk_level'] ?? {},
      0.95
    )
  }
}
