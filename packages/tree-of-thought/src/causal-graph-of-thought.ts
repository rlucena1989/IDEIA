import { Goal, ThoughtState, CausalScore, ThoughtGraph, ThoughtEdge, Thought, GoTConfig, DEFAULT_GOT_CONFIG } from './types';
import { createLogger } from '@ideia/logger';
import { ThoughtNode } from './thought-node';
import { HeuristicScorer } from './heuristic-scorer';
import { generateThoughts } from './beam-search';
const logger = createLogger('causal-graph-of-thought');

export class CausalGraphOfThought {
  private _causalMatrix: Map<string, Map<string, CausalScore>> = new Map();
  private _scorer: HeuristicScorer;
  private _config: GoTConfig;

  constructor(scorer?: HeuristicScorer, config?: Partial<GoTConfig>) {
    this._scorer = scorer || new HeuristicScorer();
    this._config = { ...DEFAULT_GOT_CONFIG, ...config };
  }

  expand(parent: Thought): Thought[] {
    const goal: Goal = {
      id: 'got-goal',
      description: parent.content,
      type: 'feature',
      complexity: 0.5,
      urgency: 0.5,
      risk: 0.3,
      domain: 'general',
      constraints: [],
      context: {},
    };

    const children = generateThoughts(goal, undefined, 3).map(tn => this._thoughtNodeToThought(tn, parent));

    for (const child of children) {
      const score = this._estimateCausalInfluence(parent, child);
      this._registerCausalScore(parent.id, child.id, score);
    }

    return children;
  }

  prune(graph: ThoughtGraph, causalScores: Map<string, number>): ThoughtGraph {
    const prunedNodes = graph.nodes.filter(n => (causalScores.get(n.id) || 0) >= 0.3 || n.isRoot);
    const keepNodes = new Set(prunedNodes.map(n => n.id));

    const prunedEdges = graph.edges.filter(e =>
      keepNodes.has(e.source) && keepNodes.has(e.target)
    );

    return { nodes: prunedNodes, edges: prunedEdges };
  }

  merge(paths: Thought[][]): Thought {
    const allThoughts = paths.flat();
    const ranked = allThoughts
      .map(t => ({
        thought: t,
        causalWeight: this._getMaxInfluence(t.id),
      }))
      .sort((a, b) => b.causalWeight - a.causalWeight);

    const topThoughts = ranked.slice(0, 3);

    return {
      id: `merged_${Date.now()}`,
      content: `[CAUSAL-MERGE] ${topThoughts.map(t => t.thought.content).join(' | ')}`,
      depth: Math.max(...topThoughts.map(t => t.thought.depth)),
      children: topThoughts.map(t => t.thought.id),
      causalScore: topThoughts.reduce((s, t) => s + t.causalWeight, 0) / topThoughts.length,
      mergedFrom: topThoughts.map(t => t.thought.id),
      metadata: { coverage: 0.5, granularity: 0.5, cost: 0.3 },
    } as Thought;
  }

  execute(goal: string): ThoughtGraph {
    const root = this._createRootThought(goal);
    const graph: ThoughtGraph = { nodes: [root as unknown as import('./types').ThoughtNode], edges: [] };

    for (let depth = 0; depth < 4; depth++) {
      const frontier = graph.nodes.filter(n => n.depth === depth);

      for (const node of frontier) {
        const children = this.expand(node as any);
        const scores = children.map(c => ({
          id: c.id,
          score: this._causalMatrix.get(node.id)?.get(c.id)?.influence || 0,
        }));

        const scoresMap = new Map(scores.map(s => [s.id, s.score]));
        const prunedChildren = children.filter(c =>
          (scoresMap.get(c.id) || 0) >= 0.3
        );

        for (const child of prunedChildren) {
          graph.nodes.push(child as any);
          graph.edges.push({ source: node.id, target: child.id } as any);
        }
      }

      const mergeCandidates = this._findMergeCandidates(graph, 0.7);
      for (const [a, b] of mergeCandidates) {
        const merged = this.mergePaths([this._pathToRoot(a), this._pathToRoot(b)]);
        graph.nodes.push(merged as any);
      }
    }

    return graph as unknown as ThoughtGraph;
  }

  private _estimateCausalInfluence(parent: Thought, child: Thought): CausalScore {
    const parentCoverage = (parent.metadata as { coverage?: number })?.coverage || 0;
    const childCoverage = (child.metadata as { coverage?: number })?.coverage || 0;
    const influence = Math.abs(childCoverage - parentCoverage);
    const interventionEffect = parentCoverage > 0 ? childCoverage / parentCoverage : 0;

    return {
      sourceId: parent.id,
      targetId: child.id,
      influence: Math.min(1, influence),
      isCausal: influence >= 0.3,
      interventionEffect,
    };
  }

  private _registerCausalScore(sourceId: string, targetId: string, score: CausalScore): void {
    if (!this._causalMatrix.has(sourceId)) {
      this._causalMatrix.set(sourceId, new Map());
    }
    this._causalMatrix.get(sourceId)!.set(targetId, score);
  }

  private _getMaxInfluence(thoughtId: string): number {
    let max = 0;
    for (const [, targets] of this._causalMatrix) {
      const score = targets.get(thoughtId);
      if (score && (score.influence ?? 0) > max) max = score.influence ?? 0;
    }
    return max;
  }

  private _createRootThought(goal: string): Thought {
    return {
      id: 'root',
      content: goal,
      depth: 0,
      children: [],
      isRoot: true,
      metadata: { coverage: 0, granularity: 0, cost: 0 },
    };
  }

  private _findMergeCandidates(graph: ThoughtGraph, threshold: number): [Thought, Thought][] {
    const candidates: [Thought, Thought][] = [];
    const nodes = graph.nodes;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const influenceItoJ = this._causalMatrix.get(nodes[i].id)?.get(nodes[j].id)?.influence || 0;
        const influenceJtoI = this._causalMatrix.get(nodes[j].id)?.get(nodes[i].id)?.influence || 0;

        if (Math.max(influenceItoJ, influenceJtoI) > threshold) {
          candidates.push([nodes[i], nodes[j]]);
        }
      }
    }

    return candidates;
  }

  private _pathToRoot(node: Thought): Thought[] {
    const path: Thought[] = [node];
    let current = node;

    while (current.parentId) {
      const parent = this._findParent(current);
      if (parent) {
        path.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }

    return path;
  }

  private mergePaths(paths: Thought[][]): Thought {
    const allContent = paths.map(p => p.map(t => t.content).join(' -> ')).join(' || ');
    const mergedIds = paths.flat().map(t => t.id);

    return {
      id: `merged_${Date.now()}`,
      content: `[CAUSAL-MERGE] ${allContent.substring(0, 200)}`,
      depth: Math.max(...paths.map(p => p.length)),
      children: paths.flat().map(t => t.id),
      causalScore: 1.0,
      mergedFrom: mergedIds,
      metadata: { coverage: 0.5, granularity: 0.5, cost: 0.3 },
    } as Thought;
  }

  private _thoughtNodeToThought(tn: ThoughtNode, parent?: Thought): Thought {
    return {
      id: tn.id,
      content: tn.content,
      depth: tn.depth,
      children: [],
      parentId: parent?.id,
      metadata: {
        coverage: tn.metadata.coverage,
        granularity: tn.metadata.granularity,
        cost: tn.metadata.cost,
      },
      state: tn.state,
      value: tn.value,
      visits: tn.visits,
    };
  }

  private _findParent(node: Thought): Thought | undefined {
    for (const [sourceId, targets] of this._causalMatrix) {
      if (targets.has(node.id)) {
        return { id: sourceId } as Thought;
      }
    }
    return undefined;
  }
}
