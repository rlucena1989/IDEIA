import { createLogger } from '@ideia/logger'
import { ThoughtNode, ThoughtTree, EvaluationResult, SearchResult, SearchStrategy, ThoughtStatus } from './types'

const logger = createLogger('tree-of-thought')

export class TreeOfThought {
  private tree: ThoughtTree
  private nodeCounter = 0

  constructor(strategy: SearchStrategy = 'bfs', maxDepth = 5, branchingFactor = 3) {
    this.tree = {
      rootId: '',
      nodes: new Map(),
      strategy,
      maxDepth,
      branchingFactor,
    }
    this.tree.rootId = this.createNode('root', null, 0).id
  }

  private createNode(content: string, parentId: string | null, depth: number): ThoughtNode {
    const node: ThoughtNode = {
      id: `thought-${this.nodeCounter++}`,
      content, parentId, children: [],
      depth, value: 0, visits: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    this.tree.nodes.set(node.id, node)
    return node
  }

  expand(parentId: string, thoughts: string[]): ThoughtNode[] {
    const parent = this.tree.nodes.get(parentId)
    if (!parent || parent.depth >= this.tree.maxDepth) return []
    const limited = thoughts.slice(0, this.tree.branchingFactor)
    const nodes = limited.map(t => {
      const node = this.createNode(t, parentId, parent.depth + 1)
      parent.children.push(node.id)
      return node
    })
    logger.info(`Expanded node`, { parentId, children: nodes.length })
    return nodes
  }

  evaluate(nodeId: string, score: number, confidence: number): EvaluationResult {
    const node = this.tree.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)
    node.value = score
    node.visits++
    node.status = 'evaluated'
    return { nodeId, score, confidence, reasoning: `Score ${score} with confidence ${confidence}`, isPromising: score > 0.5 }
  }

  search(): SearchResult {
    const start = Date.now()
    let nodesExplored = 0
    let totalEvaluations = 0

    switch (this.tree.strategy) {
      case 'bfs': return this.bfsSearch(start)
      case 'dfs': return this.dfsSearch(start)
      case 'beam': return this.beamSearch(start)
      case 'mcts': return this.mctsSearch(start)
      default: return this.bfsSearch(start)
    }
  }

  private bfsSearch(start: number): SearchResult {
    const queue = [this.tree.rootId]
    let bestNode = this.tree.nodes.get(this.tree.rootId) ?? { id: '', content: '', parentId: null, children: [], depth: 0, value: -Infinity, visits: 0, status: 'active', createdAt: '' }

    while (queue.length > 0) {
      const currentId = queue.shift()
      if (!currentId) break
      const current = this.tree.nodes.get(currentId)
      if (!current) continue
      if (current.value > bestNode.value) bestNode = current
      queue.push(...current.children)
    }

    const path = this.buildPath(bestNode.id)
    return { bestPath: path, bestValue: bestNode.value, nodesExplored: this.tree.nodes.size, totalEvaluations: this.nodeCounter, durationMs: Date.now() - start }
  }

  private dfsSearch(start: number): SearchResult {
    const bestNode = this.tree.nodes.get(this.tree.rootId) ?? { id: '', content: '', parentId: null, children: [], depth: 0, value: -Infinity, visits: 0, status: 'active', createdAt: '' }
    const visited = new Set<string>()

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)
      const node = this.tree.nodes.get(nodeId)
      if (!node) return
      if (node.value > bestNode.value) bestNode.value = node.value
      for (const childId of node.children) dfs(childId)
    }
    dfs(this.tree.rootId)

    return { bestPath: this.buildPath(bestNode.id), bestValue: bestNode.value, nodesExplored: visited.size, totalEvaluations: this.nodeCounter, durationMs: Date.now() - start }
  }

  private beamSearch(start: number): SearchResult {
    let beam = [this.tree.rootId]
    const bestNode = this.tree.nodes.get(this.tree.rootId) ?? { id: '', content: '', parentId: null, children: [], depth: 0, value: -Infinity, visits: 0, status: 'active', createdAt: '' }

    while (beam.length > 0) {
      const candidates: Array<{ id: string; value: number }> = []
      for (const id of beam) {
        const node = this.tree.nodes.get(id)
        if (!node) continue
        candidates.push(...node.children.map(c => ({ id: c, value: this.tree.nodes.get(c)?.value ?? 0 })))
      }
      candidates.sort((a, b) => b.value - a.value)
      beam = candidates.slice(0, this.tree.branchingFactor).map(c => c.id)
      for (const b of beam) {
        const node = this.tree.nodes.get(b)
        if (node && node.value > bestNode.value) bestNode.value = node.value
      }
    }

    return { bestPath: this.buildPath(bestNode.id), bestValue: bestNode.value, nodesExplored: this.tree.nodes.size, totalEvaluations: this.nodeCounter, durationMs: Date.now() - start }
  }

  private mctsSearch(start: number): SearchResult {
    const bestNode = this.tree.nodes.get(this.tree.rootId) ?? { id: '', content: '', parentId: null, children: [], depth: 0, value: -Infinity, visits: 0, status: 'active', createdAt: '' }
    for (const [, node] of this.tree.nodes) {
      if (node.value > bestNode.value) bestNode.value = node.value
    }
    return { bestPath: this.buildPath(bestNode.id), bestValue: bestNode.value, nodesExplored: this.tree.nodes.size, totalEvaluations: this.nodeCounter, durationMs: Date.now() - start }
  }

  getNode(id: string): ThoughtNode | undefined { return this.tree.nodes.get(id) }
  getTree(): ThoughtTree { return this.tree }

  private buildPath(nodeId: string): string[] {
    const path: string[] = []
    let current = this.tree.nodes.get(nodeId)
    while (current) {
      path.unshift(current.id)
      current = current.parentId ? this.tree.nodes.get(current.parentId) : undefined
    }
    return path
  }
}
