import { RiskNodeDefinition, Factor, SCMNode } from './types'
import { createLogger } from '@ideia/logger';
import { StructuralCausalModel } from './scm'
const logger = createLogger('bayesian-risk-network');

export class BayesianRiskNetwork {
  private _nodes: Map<string, RiskNodeDefinition> = new Map()
  private _factorsCache: Factor[] | null = null

  constructor(definitions: RiskNodeDefinition[]) {
    for (const def of definitions) {
      this._nodes.set(def.name, def)
    }
  }

  addNode(def: RiskNodeDefinition): void {
    this._nodes.set(def.name, def)
    this._factorsCache = null
  }

  getNode(name: string): RiskNodeDefinition | undefined {
    return this._nodes.get(name)
  }

  getFactors(): Factor[] {
    if (this._factorsCache) return this._factorsCache
    const factors: Factor[] = []
    for (const [, node] of this._nodes) {
      for (const [key, prob] of Object.entries(node.cpt)) {
        const values: Record<string, string> = {}
        const parts = key.split('|')
        values[node.name] = parts[0]
        if (parts.length > 1) {
          const parentValues = parts[1].split(',')
          node.parents.forEach((p, i) => {
            values[p] = parentValues[i]
          })
        }
        factors.push({ variables: [node.name, ...node.parents], values: values as unknown as string[], probability: prob } as Factor)
      }
    }
    this._factorsCache = factors
    return factors
  }

  getTopology(): string[] {
    return [...this._nodes.keys()]
  }

  getDagEdges(): { from: string; to: string }[] {
    const edges: { from: string; to: string }[] = []
    for (const [, node] of this._nodes) {
      for (const parent of node.parents) {
        edges.push({ from: parent, to: node.name })
      }
    }
    return edges
  }

  getNodeCount(): number {
    return this._nodes.size
  }

  getEdgeCount(): number {
    return this.getDagEdges().length
  }

  toStructuralCausalModel(): StructuralCausalModel {
    const scm = new StructuralCausalModel()
    for (const [name, def] of this._nodes) {
      const node: SCMNode = {
        name,
        equation: ((_parents: Record<string, string>, _noise: number) => {
          return def.values[0] ?? ''
        }) as unknown as (...args: unknown[]) => unknown,
        parents: def.parents,
        domain: (def.values ?? []).join(','),
        noiseDistribution: 'categorical',
      } as unknown as SCMNode
      scm.addNode(node)
    }
    return scm
  }
}
