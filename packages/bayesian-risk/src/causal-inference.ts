import { BayesianRiskNetwork } from './bayesian-risk-network'
import { createLogger } from '@ideia/logger';
import { VariableEliminationEngine } from './variable-elimination'
const logger = createLogger('causal-inference');

export class CausalInferenceEngine {
  constructor(
    private _network: BayesianRiskNetwork,
    private _engine: VariableEliminationEngine
  ) {}

  averageCausalEffect(
    action: string,
    outcome: string,
    exposed: string,
    control: string,
    confounders: string[]
  ): number {
    return (
      this._engine.estimateCausalEffect(action, exposed, outcome, confounders) -
      this._engine.estimateCausalEffect(action, control, outcome, confounders)
    )
  }

  mediationAnalysis(
    action: string,
    actionValue: string,
    outcome: string,
    mediator: string,
    confounders: string[]
  ): { direct: number; indirect: number; total: number } {
    const total = this._engine.estimateCausalEffect(action, actionValue, outcome, confounders)
    const direct = this.estimateDirect(action, actionValue, outcome, mediator, confounders)
    return { direct, indirect: total - direct, total }
  }

  private estimateDirect(
    action: string,
    av: string,
    outcome: string,
    mediator: string,
    confounders: string[]
  ): number {
    let effect = 0
    const medValues = this._network.getNode(mediator)?.values ?? []
    for (const mVal of medValues) {
      const pMed = this._engine.infer({}, mediator)[mVal]
      const ce = this._engine.estimateCausalEffect(action, av, outcome, [...confounders, mediator])
      effect += (pMed ?? 0) * ce
    }
    return effect
  }
}
