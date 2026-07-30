import { BayesianRiskNetwork } from './bayesian-risk-network'
import { createLogger } from '@ideia/logger';
import { VariableEliminationEngine } from './variable-elimination'
const logger = createLogger('mcmc-inference');

export class MCMCInference {
  private _network: BayesianRiskNetwork

  constructor(network: BayesianRiskNetwork) {
    this._network = network
  }

  gibbsSample(
    evidence: Record<string, string>,
    query: string,
    numSamples: number = 5000,
    burnIn: number = 1000
  ): Record<string, number> {
    const nodes = this._network.getTopology()
    const current: Record<string, string> = { ...evidence }
    for (const n of nodes) {
      if (!(n in current)) {
        current[n] = this._network.getNode(n)?.values[0] ?? ''
      }
    }
    const counts: Record<string, number> = {}
    for (let i = 0; i < numSamples + burnIn; i++) {
      for (const node of nodes) {
        if (node in evidence) continue
        current[node] = this.sampleNode(node, current)
      }
      if (i >= burnIn) {
        counts[current[query]] = (counts[current[query]] ?? 0) + 1
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const result: Record<string, number> = {}
    for (const [val, count] of Object.entries(counts)) {
      result[val] = count / total
    }
    return result
  }

  private sampleNode(node: string, current: Record<string, string>): string {
    const def = this._network.getNode(node)
    if (!def) return current[node]
    const parentVals = def.parents.map(p => current[p])
    const _childVals = this.getChildrenStates(node, current)
    const evidence: Record<string, string> = {}
    def.parents.forEach((p, i) => {
      evidence[p] = parentVals[i]
    })
    const engine = new VariableEliminationEngine(this._network)
    const dist = engine.infer(evidence, node)
    const r = Math.random()
    let cum = 0
    for (const [val, prob] of Object.entries(dist)) {
      cum += prob
      if (r <= cum) return val
    }
    return def.values[0] ?? ''
  }

  private getChildrenStates(
    node: string,
    current: Record<string, string>
  ): Record<string, string> {
    const states: Record<string, string> = {}
    for (const edge of this._network.getDagEdges()) {
      if (edge.from === node) {
        states[edge.to] = current[edge.to] ?? ''
      }
    }
    return states
  }
}
