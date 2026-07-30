import { SCMNode } from './types'
import { createLogger } from '@ideia/logger';
import { BayesianRiskNetwork } from './bayesian-risk-network'
import { RiskNodeDefinition } from './types'
const logger = createLogger('scm');

export class StructuralCausalModel {
  private _nodes: Map<string, SCMNode> = new Map()

  addNode(node: SCMNode): void {
    this._nodes.set(node.name, node)
  }

  sample(noise?: Record<string, number>): Record<string, string> {
    const result: Record<string, string> = {}
    const topo = this.topoSort()
    for (const name of topo) {
      const node = this._nodes.get(name)
      if (!node) continue
      const parentValues: Record<string, string> = {}
      for (const p of node.parents) {
        parentValues[p] = result[p]
      }
      result[name] = String(node.equation(parentValues, noise?.[name] ?? Math.random()) ?? '')
    }
    return result
  }

  intervene(action: string, actionValue: string, noise?: Record<string, number>): Record<string, string> {
    const result: Record<string, string> = {}
    const topo = this.topoSort()
    for (const name of topo) {
      if (name === action) {
        result[name] = actionValue
        continue
      }
      const node = this._nodes.get(name)
      if (!node) continue
      const parentValues: Record<string, string> = {}
      for (const p of node.parents) {
        parentValues[p] = result[p]
      }
      result[name] = String(node.equation(parentValues, noise?.[name] ?? Math.random()) ?? '')
    }
    return result
  }

  counterfactual(
    evidence: Record<string, string>,
    action: string,
    actionValue: string,
    samples: number = 1000
  ): Record<string, number> {
    const counts: Record<string, number> = {}
    for (let i = 0; i < samples; i++) {
      const cf = this.intervene(action, actionValue)
      for (const v of Object.keys(evidence).filter(v => v !== action)) {
        if (cf[v] === evidence[v]) {
          counts[v] = (counts[v] ?? 0) + 1
        }
      }
    }
    const result: Record<string, number> = {}
    for (const [v, c] of Object.entries(counts)) {
      result[v] = c / samples
    }
    return result
  }

  topoSort(): string[] {
    const visited = new Set<string>()
    const result: string[] = []
    const visit = (name: string) => {
      if (visited.has(name)) return
      visited.add(name)
      const node = this._nodes.get(name)
      if (node) {
        for (const p of node.parents) {
          visit(p)
        }
      }
      result.push(name)
    }
    for (const name of this._nodes.keys()) {
      visit(name)
    }
    return result
  }

  toBayesianRiskNetwork(): BayesianRiskNetwork {
    const defs: RiskNodeDefinition[] = []
    for (const name of this.topoSort()) {
      const node = this._nodes.get(name)
      if (!node) continue
      const domain = node.domain ?? ''
      const domainVals: string[] = domain ? [domain] : []
      const cpt: Record<string, number> = {}
      for (const val of domainVals) {
        cpt[val] = 1 / (domainVals.length || 1)
      }
      defs.push({ name, values: domainVals, parents: node.parents, cpt })
    }
    return new BayesianRiskNetwork(defs)
  }
}
