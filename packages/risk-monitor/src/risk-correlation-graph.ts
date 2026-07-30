import { type RiskNode, type RiskEdge } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('risk-correlation-graph');

export interface RiskPropagationPath {
  path: string[]
  totalRisk: number
  bottleneck: string
  hops: number
}

export interface GraphSummary {
  nodeCount: number
  edgeCount: number
  density: number
  avgPageRank: number
  communityCount: number
  avgRiskScore: number
}

export class RiskCorrelationGraph {
  private _nodes: Map<string, RiskNode> = new Map()
  private _edges: RiskEdge[] = []
  private _adjacencyList: Map<string, Map<string, number>> = new Map()
  private _precisionMatrix: number[][] = []
  private _lambda: number

  constructor(lambda?: number) {
    this._lambda = lambda ?? 0.01
  }

  addNode(id: string, label: string, type: RiskNode['type'], riskScore: number): void {
    this._nodes.set(id, {
      id,
      label,
      type,
      riskScore,
      pageRank: 0,
      betweenness: 0,
      community: -1,
    })
    if (!this._adjacencyList.has(id)) {
      this._adjacencyList.set(id, new Map())
    }
  }

  addEdge(source: string, target: string, weight: number, direction: RiskEdge['direction'] = 'bidirectional'): void {
    this._edges.push({
      source,
      target,
      weight: Math.max(0, Math.min(1, weight)),
      partialCorrelation: 0,
      direction,
    })
    const sourceNeighbors = this._adjacencyList.get(source)
    if (sourceNeighbors !== undefined) {
      sourceNeighbors.set(target, weight)
    }
    if (direction === 'bidirectional') {
      const targetNeighbors = this._adjacencyList.get(target)
      if (targetNeighbors !== undefined) {
        targetNeighbors.set(source, weight)
      }
    }
  }

  getNode(id: string): RiskNode | undefined {
    return this._nodes.get(id)
  }

  getNodes(): RiskNode[] {
    return Array.from(this._nodes.values())
  }

  getEdges(): RiskEdge[] {
    return [...this._edges]
  }

  getNodeCount(): number {
    return this._nodes.size
  }

  getEdgeCount(): number {
    return this._edges.length
  }

  async learnCorrelations(observations: Array<Record<string, number>>): Promise<void> {
    const nodeIds = Array.from(this._nodes.keys())
    const n = nodeIds.length
    const m = observations.length

    if (n === 0 || m < 2) return

    const correlationMatrix = this._computeEmpiricalCorrelation(nodeIds, observations)
    this._precisionMatrix = this._graphicalLasso(correlationMatrix, this._lambda)

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pii = this._precisionMatrix[i][i]
        const pjj = this._precisionMatrix[j][j]
        if (pii <= 0 || pjj <= 0) continue

        const partialCorr = -this._precisionMatrix[i][j] / Math.sqrt(pii * pjj)

        if (Math.abs(partialCorr) > 0.1) {
          const existing = this._edges.find(
            e => (e.source === nodeIds[i] && e.target === nodeIds[j]) ||
                 (e.source === nodeIds[j] && e.target === nodeIds[i])
          )
          if (existing !== undefined) {
            existing.partialCorrelation = partialCorr
            existing.weight = Math.abs(partialCorr)
          } else {
            this.addEdge(nodeIds[i], nodeIds[j], Math.abs(partialCorr), 'bidirectional')
          }
        }
      }
    }
  }

  computePageRank(damping = 0.85, iterations = 100): void {
    const n = this._nodes.size
    if (n === 0) return

    const ids = Array.from(this._nodes.keys())
    let ranks = new Map(ids.map(id => [id, 1 / n]))

    for (let iter = 0; iter < iterations; iter++) {
      const newRanks = new Map<string, number>()

      for (const [id] of ranks) {
        const neighbors = this._adjacencyList.get(id) ?? new Map()
        let sum = 0
        for (const [nid] of neighbors) {
          const degree = this._adjacencyList.get(nid)?.size ?? 1
          sum += (ranks.get(nid) ?? 0) / Math.max(1, degree)
        }
        newRanks.set(id, (1 - damping) / n + damping * sum)
      }

      ranks = newRanks
    }

    for (const [id, rank] of ranks) {
      const node = this._nodes.get(id)
      if (node !== undefined) {
        node.pageRank = rank
      }
    }
  }

  computeBetweennessCentrality(): void {
    const ids = Array.from(this._nodes.keys())

    for (const node of this._nodes.values()) {
      node.betweenness = 0
    }

    for (const s of ids) {
      const stack: string[] = []
      const pred = new Map<string, string[]>()
      const sigma = new Map<string, number>()
      const dist = new Map<string, number>()
      const delta = new Map<string, number>()

      for (const t of ids) {
        pred.set(t, [])
        sigma.set(t, 0)
        dist.set(t, -1)
        delta.set(t, 0)
      }

      sigma.set(s, 1)
      dist.set(s, 0)
      const queue = [s]

      while (queue.length > 0) {
        const v = queue.shift()
        if (v === undefined) break
        stack.push(v)
        const neighbors = this._adjacencyList.get(v) ?? new Map()

        for (const w of neighbors.keys()) {
          const distW = dist.get(w) ?? -1
          const distV = dist.get(v) ?? 0

          if (distW === -1) {
            dist.set(w, distV + 1)
            queue.push(w)
          }

          if (distW === distV + 1) {
            sigma.set(w, (sigma.get(w) ?? 0) + (sigma.get(v) ?? 0))
            pred.get(w)?.push(v)
          }
        }
      }

      while (stack.length > 0) {
        const w = stack.pop()
        if (w === undefined) break
        for (const v of pred.get(w) ?? []) {
          const contribution = ((sigma.get(v) ?? 0) / (sigma.get(w) ?? 1)) * (1 + (delta.get(w) ?? 0))
          delta.set(v, (delta.get(v) ?? 0) + contribution)
        }
        if (w !== s) {
          const node = this._nodes.get(w)
          if (node !== undefined) {
            node.betweenness += delta.get(w) ?? 0
          }
        }
      }
    }

    const maxBetweenness = Math.max(...Array.from(this._nodes.values()).map(n => n.betweenness), 1)
    for (const node of this._nodes.values()) {
      node.betweenness = node.betweenness / maxBetweenness
    }
  }

  detectCommunities(): void {
    const ids = Array.from(this._nodes.keys())
    const n = ids.length
    const labels = ids.map((_, i) => i)
    const adjacency = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const edge = this._edges.find(
          e => (e.source === ids[i] && e.target === ids[j]) ||
               (e.source === ids[j] && e.target === ids[i])
        )
        return edge !== undefined ? edge.weight : 0
      })
    )

    let changed = true
    while (changed) {
      changed = false
      for (let i = 0; i < n; i++) {
        const labelCounts = new Map<number, number>()
        for (let j = 0; j < n; j++) {
          if (adjacency[i][j] > 0) {
            labelCounts.set(labels[j], (labelCounts.get(labels[j]) ?? 0) + adjacency[i][j])
          }
        }
        let maxCount = 0
        let maxLabel = labels[i]
        for (const [label, count] of labelCounts) {
          if (count > maxCount) {
            maxCount = count
            maxLabel = label
          }
        }
        if (labels[i] !== maxLabel) {
          labels[i] = maxLabel
          changed = true
        }
      }
    }

    const uniqueLabels = [...new Set(labels)]
    for (let i = 0; i < n; i++) {
      const node = this._nodes.get(ids[i])
      if (node !== undefined) {
        node.community = uniqueLabels.indexOf(labels[i])
      }
    }
  }

  findPropagationPaths(source: string, maxHops = 5): RiskPropagationPath[] {
    const paths: RiskPropagationPath[] = []
    const visited = new Set<string>()
    const queue: Array<{ node: string; path: string[]; risk: number }> = [
      { node: source, path: [source], risk: this._nodes.get(source)?.riskScore ?? 0 },
    ]

    while (queue.length > 0) {
      const entry = queue.shift()
      if (entry === undefined) break
      const { node, path, risk } = entry
      visited.add(node)

      const neighbors = this._adjacencyList.get(node) ?? new Map()
      for (const [neighbor, weight] of neighbors) {
        if (visited.has(neighbor)) continue
        if (path.length >= maxHops) continue

        const neighborRisk = this._nodes.get(neighbor)?.riskScore ?? 0
        const combinedRisk = risk * weight + neighborRisk * 0.5
        const newPath = [...path, neighbor]

        let bottleneck = path[0]
        let minRisk = Infinity
        for (const p of newPath) {
          const r = this._nodes.get(p)?.riskScore ?? 0
          if (r < minRisk) {
            minRisk = r
            bottleneck = p
          }
        }

        paths.push({
          path: newPath,
          totalRisk: combinedRisk,
          bottleneck,
          hops: newPath.length - 1,
        })

        queue.push({
          node: neighbor,
          path: newPath,
          risk: combinedRisk,
        })
      }
    }

    return paths.sort((a, b) => b.totalRisk - a.totalRisk)
  }

  getTopRiskNodes(k = 10): RiskNode[] {
    return Array.from(this._nodes.values())
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, k)
  }

  getGraphSummary(): GraphSummary {
    const n = this._nodes.size
    const maxEdges = n * (n - 1) / 2
    const density = maxEdges > 0 ? this._edges.length / maxEdges : 0
    const nodeArray = Array.from(this._nodes.values())
    const avgPageRank = n > 0 ? nodeArray.reduce((s, node) => s + node.pageRank, 0) / n : 0
    const communitySet = new Set(nodeArray.map(node => node.community))
    const avgRiskScore = n > 0 ? nodeArray.reduce((s, node) => s + node.riskScore, 0) / n : 0

    return {
      nodeCount: n,
      edgeCount: this._edges.length,
      density,
      avgPageRank,
      communityCount: communitySet.size,
      avgRiskScore,
    }
  }

  getCorrelationMatrix(): { nodeIds: string[]; matrix: number[][] } {
    return {
      nodeIds: Array.from(this._nodes.keys()),
      matrix: this._precisionMatrix.map(row => [...row]),
    }
  }

  toJSON(): { nodes: RiskNode[]; edges: RiskEdge[] } {
    return {
      nodes: Array.from(this._nodes.values()),
      edges: this._edges,
    }
  }

  private _computeEmpiricalCorrelation(ids: string[], observations: Array<Record<string, number>>): number[][] {
    const n = ids.length
    const m = observations.length

    const means = ids.map(id => observations.reduce((s, o) => s + (o[id] ?? 0), 0) / m)
    const stds = ids.map((id, i) => {
      const variance = observations.reduce((s, o) => s + ((o[id] ?? 0) - means[i]) ** 2, 0) / m
      return Math.sqrt(variance + 1e-10)
    })

    const corr: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))

    for (let i = 0; i < n; i++) {
      corr[i][i] = 1
      for (let j = i + 1; j < n; j++) {
        let cov = 0
        for (const obs of observations) {
          cov += ((obs[ids[i]] ?? 0) - means[i]) * ((obs[ids[j]] ?? 0) - means[j])
        }
        cov /= m
        corr[i][j] = cov / (stds[i] * stds[j])
        corr[j][i] = corr[i][j]
      }
    }

    return corr
  }

  private _graphicalLasso(S: number[][], lambda: number): number[][] {
    const n = S.length
    const W = S.map(row => [...row])
    const theta = S.map(row => [...row])

    for (let iter = 0; iter < 100; iter++) {
      for (let i = 0; i < n; i++) {
        const rows = Array.from({ length: n }, (_, r) => r).filter(r => r !== i)

        const W11 = rows.map(r => rows.map(c => W[r][c]))
        const s12 = rows.map(r => S[r][i])

        const beta = this._lassoRegression(W11, s12, lambda)

        for (let j = 0; j < rows.length; j++) {
          const rowJ = rows[j]
          for (let k = 0; k < rows.length; k++) {
            const colK = rows[k]
            W[rowJ][i] = W[rowJ][i] - beta[j] * W[i][colK]
          }
        }

        const theta12 = beta.map((b, j) => -b * theta[i][i])
        for (let j = 0; j < rows.length; j++) {
          theta[rows[j]][i] = theta12[j]
          theta[i][rows[j]] = theta12[j]
        }
      }
    }

    return theta
  }

  private _lassoRegression(X: number[][], y: number[], lambda: number): number[] {
    const n = X.length
    const p = X[0].length
    const beta = new Array(p).fill(0)
    const maxIter = 100

    for (let iter = 0; iter < maxIter; iter++) {
      for (let j = 0; j < p; j++) {
        let rho = 0
        for (let i = 0; i < n; i++) {
          let pred = 0
          for (let k = 0; k < p; k++) {
            if (k !== j) pred += X[i][k] * beta[k]
          }
          rho += X[i][j] * (y[i] - pred)
        }

        const z = Math.max(0, Math.abs(rho) - lambda)
        beta[j] = Math.sign(rho) * z / Math.max(1e-10, n)
      }
    }

    return beta
  }
}
