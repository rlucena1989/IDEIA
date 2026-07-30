import { BayesianRiskNetwork } from './bayesian-risk-network'
import { createLogger } from '@ideia/logger';
const logger = createLogger('d-separation');

export class DSeparationChecker {
  private _network: BayesianRiskNetwork

  constructor(network: BayesianRiskNetwork) {
    this._network = network
  }

  isDSeparated(
    x: string,
    y: string,
    conditioningSet: string[]
  ): boolean {
    const allPaths = this.findAllPaths(x, y, [])
    for (const path of allPaths) {
      if (!this.pathIsBlocked(path, conditioningSet)) {
        return false
      }
    }
    return true
  }

  getMarkovBlanket(node: string): string[] {
    const blanket = new Set<string>()
    const def = this._network.getNode(node)
    if (!def) return []
    for (const p of def.parents) blanket.add(p)
    for (const edge of this._network.getDagEdges()) {
      if (edge.to === node) blanket.add(edge.from)
      if (edge.from === node) {
        blanket.add(edge.to)
        const childDef = this._network.getNode(edge.to)
        if (childDef) {
          for (const coParent of childDef.parents) {
            if (coParent !== node) blanket.add(coParent)
          }
        }
      }
    }
    return [...blanket]
  }

  private findAllPaths(
    x: string,
    y: string,
    visited: string[]
  ): string[][] {
    if (x === y) return [[x]]
    const paths: string[][] = []
    const newVisited = [...visited, x]
    for (const edge of this._network.getDagEdges()) {
      if (edge.from === x && !visited.includes(edge.to)) {
        const subPaths = this.findAllPaths(edge.to, y, newVisited)
        for (const sp of subPaths) {
          paths.push([x, ...sp])
        }
      }
      if (edge.to === x && !visited.includes(edge.from)) {
        const subPaths = this.findAllPaths(edge.from, y, newVisited)
        for (const sp of subPaths) {
          paths.push([x, ...sp])
        }
      }
    }
    return paths
  }

  private pathIsBlocked(
    path: string[],
    conditioningSet: string[]
  ): boolean {
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1]
      const curr = path[i]
      const next = path[i + 1]
      const hasPrevEdge = this._network
        .getDagEdges()
        .some(e => e.from === prev && e.to === curr)
      const hasNextEdge = this._network
        .getDagEdges()
        .some(e => e.from === curr && e.to === next)
      const hasPrevIncoming = this._network
        .getDagEdges()
        .some(e => e.to === prev && e.from === curr)
      const hasNextIncoming = this._network
        .getDagEdges()
        .some(e => e.to === next && e.from === curr)
      const isChain = hasPrevEdge && hasNextEdge
      const isFork = hasPrevIncoming && hasNextIncoming
      const isCollider = hasPrevEdge && hasNextIncoming
      if (isChain || isFork) {
        if (conditioningSet.includes(curr)) return true
      }
      if (isCollider) {
        const descendants = this.getDescendants(curr)
        if (
          !conditioningSet.includes(curr) &&
          !descendants.some(d => conditioningSet.includes(d))
        )
          return true
      }
    }
    return false
  }

  private getDescendants(node: string): string[] {
    const result: string[] = []
    const queue = [node]
    const visited = new Set<string>()
    while (queue.length > 0) {
      const current = queue.shift()
      if (!current || visited.has(current)) continue
      visited.add(current)
      for (const edge of this._network.getDagEdges()) {
        if (edge.from === current) {
          result.push(edge.to)
          queue.push(edge.to)
        }
      }
    }
    return result
  }
}
