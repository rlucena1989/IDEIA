import { BayesianRiskNetwork } from './bayesian-risk-network'
import { createLogger } from '@ideia/logger';
import { VariableEliminationEngine } from './variable-elimination'
const logger = createLogger('risk-propagator');

export class RiskPropagator {
  constructor(
    private _network: BayesianRiskNetwork,
    private _engine: VariableEliminationEngine
  ) {}

  propagate(evidence: Record<string, string>): Record<string, number> {
    const risks: Record<string, number> = {}
    for (const nodeName of this._network.getTopology()) {
      const node = this._network.getNode(nodeName)
      if (!node) continue
      const dist = this._engine.infer(evidence, nodeName)
      risks[nodeName] =
        node.values.includes('high') || node.values.includes('critical')
          ? ['high', 'critical'].reduce((s, v) => s + (dist[v] ?? 0), 0)
          : Object.values(dist).reduce((a, b) => a + b, 0) / Object.keys(dist).length
    }
    return risks
  }

  identifyBottlenecks(evidence: Record<string, string>): string[] {
    const nr = this.propagate(evidence)
    const vals = Object.values(nr)
    if (vals.length === 0) return []
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    const variance = vals.reduce((s, r) => s + (r - mean) ** 2, 0) / vals.length
    const std = Math.sqrt(variance)
    return Object.entries(nr)
      .filter(([, r]) => r > mean + std)
      .map(([n]) => n)
  }

  sensitivityAnalysis(
    evidence: Record<string, string>,
    targetNode: string
  ): { variable: string; impact: number }[] {
    const base = this._engine.infer(evidence, targetNode)['high'] ?? this._engine.infer(evidence, targetNode)['critical'] ?? 0
    const impacts: { variable: string; impact: number }[] = []
    for (const varName of Object.keys(evidence)) {
      const node = this._network.getNode(varName)
      if (!node) continue
      for (const alt of node.values.filter(v => v !== evidence[varName])) {
        const altEvidence = { ...evidence, [varName]: alt }
        const altVal = this._engine.infer(altEvidence, targetNode)['high'] ?? this._engine.infer(altEvidence, targetNode)['critical'] ?? 0
        impacts.push({ variable: `${varName}=${alt}`, impact: Math.abs(base - altVal) })
      }
    }
    return impacts.sort((a, b) => b.impact - a.impact)
  }

  findRiskPaths(
    evidence: Record<string, string>,
    threshold: number
  ): { path: string[]; probability: number }[] {
    const paths: { path: string[]; probability: number }[] = []
    const edges = this._network.getDagEdges()
    const topology = this._network.getTopology()
    const rootNodes = topology.filter(n => {
      const node = this._network.getNode(n)
      return node && node.parents.length === 0
    })
    const leafNodes = topology.filter(n => {
      return !edges.some(e => e.from === n)
    })
    for (const root of rootNodes) {
      for (const leaf of leafNodes) {
        const allPaths = this.findAllSimplePaths(root, leaf, edges)
        for (const path of allPaths) {
          const prob = this.computePathProbability(path, evidence)
          if (prob >= threshold) {
            paths.push({ path, probability: prob })
          }
        }
      }
    }
    return paths.sort((a, b) => b.probability - a.probability)
  }

  private findAllSimplePaths(
    from: string,
    to: string,
    edges: { from: string; to: string }[]
  ): string[][] {
    const result: string[][] = []
    const visited = new Set<string>()
    const dfs = (current: string, path: string[]) => {
      if (current === to) {
        result.push([...path])
        return
      }
      visited.add(current)
      for (const edge of edges) {
        if (edge.from === current && !visited.has(edge.to)) {
          dfs(edge.to, [...path, edge.to])
        }
      }
      visited.delete(current)
    }
    dfs(from, [from])
    return result
  }

  private computePathProbability(
    path: string[],
    evidence: Record<string, string>
  ): number {
    let prob = 1
    for (let i = 1; i < path.length; i++) {
      const nodeName = path[i]
      const dist = this._engine.infer(evidence, nodeName)
      const highVal = dist['high'] ?? dist['critical'] ?? 0
      prob *= highVal > 0 ? highVal : Object.values(dist).reduce((a, b) => a + b, 0) / Object.keys(dist).length
    }
    return prob
  }
}
