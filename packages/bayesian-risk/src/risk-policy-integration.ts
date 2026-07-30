import { BayesianRiskNetwork } from './bayesian-risk-network'
import { createLogger } from '@ideia/logger';
import { VariableEliminationEngine } from './variable-elimination'
import { RiskPropagator } from './risk-propagator'
import { CausalInferenceEngine } from './causal-inference'
import { RiskQuantifier } from './risk-quantifier'
import { DSeparationChecker } from './d-separation'
import { HIGH_RISK_SCENARIO } from './scenarios'
import { PolicyRiskRequest, PolicyRiskResponse } from './types'
const logger = createLogger('risk-policy-integration');

export class RiskPolicyIntegration {
  private _network: BayesianRiskNetwork
  private _engine: VariableEliminationEngine
  private _propagator: RiskPropagator
  private _causalEngine: CausalInferenceEngine
  private _quantifier: RiskQuantifier
  private _dSeparation: DSeparationChecker
  private _riskThresholds = { allow: 0.3, review: 0.5, escalate: 0.8 }

  constructor() {
    this._network = new BayesianRiskNetwork(HIGH_RISK_SCENARIO)
    this._engine = new VariableEliminationEngine(this._network)
    this._propagator = new RiskPropagator(this._network, this._engine)
    this._causalEngine = new CausalInferenceEngine(this._network, this._engine)
    this._quantifier = new RiskQuantifier()
    this._dSeparation = new DSeparationChecker(this._network)
  }

  evaluate(request: PolicyRiskRequest): PolicyRiskResponse {
    const evidence: Record<string, string> = {
      action_type: request.action ?? 'read',
      ...request.context,
    }
    const propagated = this._propagator.propagate(evidence)
    const riskScore = propagated['risk_level'] ?? 0
    const recDist = this._engine.infer(evidence, 'recommendation')
    const topRec =
      Object.entries(recDist).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'review'
    const causalEffect = this._causalEngine.averageCausalEffect(
      'action_type',
      'risk_level',
      request.action ?? 'read',
      'read',
      ['agent_trust', 'time_context']
    )
    const sensitivityArr = this._propagator.sensitivityAnalysis(evidence, 'risk_level')
    const sensitivity: Record<string, number> = {}
    for (const item of sensitivityArr) {
      sensitivity[item.variable] = item.impact
    }
    const bottlenecks = this._propagator.identifyBottlenecks(evidence)
    const paths = this._propagator.findRiskPaths(evidence, 0.3)
    const quantification = this._quantifier.computeLossDistribution(
      this._network,
      this._engine,
      evidence,
      {
        risk_level: {
          low: 0,
          medium: 0.3,
          high: 0.7,
          critical: 1.0,
        },
      }
    )
    const decision = this.decide(riskScore, topRec, causalEffect)
    return {
      riskScore,
      recommendation: topRec,
      causalEffect: causalEffect as any,
      sensitivity,
      bottlenecks,
      paths: paths as any,
      decision,
      quantification: {
        probabilityOfFailure: quantification.probabilityOfFailure,
        expectedLoss: quantification.expectedLoss,
        valueAtRisk: quantification.valueAtRisk,
        conditionalVaR: quantification.conditionalVaR,
      },
      explanation: {
        factors: this._dSeparation.getMarkovBlanket('risk_level'),
        causalEffectDirection:
          causalEffect > 0 ? 'increases_risk' : 'decreases_risk',
      },
    }
  }

  batchEvaluate(requests: PolicyRiskRequest[]): PolicyRiskResponse[] {
    return requests.map(r => this.evaluate(r))
  }

  private decide(
    riskScore: number,
    recommendation: string,
    _causalEffect: number
  ): PolicyRiskResponse['decision'] {
    if (recommendation === 'deny' || recommendation === 'escalate')
      return recommendation
    if (riskScore >= this._riskThresholds.escalate) return 'escalate'
    if (riskScore >= this._riskThresholds.review) return 'review'
    if (riskScore <= this._riskThresholds.allow) return 'allow'
    return 'review'
  }

  updateThresholds(
    thresholds: Partial<typeof this._riskThresholds>
  ): void {
    Object.assign(this._riskThresholds, thresholds)
  }

  getNetwork(): BayesianRiskNetwork {
    return this._network
  }

  getEngine(): VariableEliminationEngine {
    return this._engine
  }

  getPropagator(): RiskPropagator {
    return this._propagator
  }

  getCausalEngine(): CausalInferenceEngine {
    return this._causalEngine
  }

  getQuantifier(): RiskQuantifier {
    return this._quantifier
  }
}
