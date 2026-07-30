import { createLogger } from '@ideia/logger';
import { AgentAction, ComputationalGraph, GraphNode, GraphEdge, AnomalyScore, AnomalyReport, Subgraph } from './types';
const logger = createLogger('gnn-defense-detector');

export class GNNDefenseDetector {
  private _gnnLayers = 3;
  private _embeddingDim = 64;
  private _anomalyThreshold = 0.7;
  private _normalPatternLibrary: ComputationalGraph[] = [];

  constructor() {
    this._initializeNormalPatterns();
  }

  private _initializeNormalPatterns(): void {
    for (let i = 0; i < 100; i++) {
      this._normalPatternLibrary.push(this._generateNormalGraph());
    }
  }

  buildGraph(actions: AgentAction[]): ComputationalGraph {
    const nodes: GraphNode[] = actions.map(
      (action) =>
        ({
          id: action.id,
          type: action.type,
          features: this._encodeAction(action),
          attributes: {
            target: action.target,
            timestamp: action.timestamp,
            parentId: action.parentActionId,
          },
        }) as GraphNode,
    );

    const edges: GraphEdge[] = [];
    for (const action of actions) {
      if (action.parentActionId) {
        edges.push({
          source: action.parentActionId,
          target: action.id,
          type: 'call',
          weight: 1.0,
        });
      }

      const temporalNeighbors: AgentAction[] = actions.filter(
        (a) => a.id !== action.id && Math.abs(a.timestamp - action.timestamp) < 1000 && !a.parentActionId,
      );
      for (const neighbor of temporalNeighbors.slice(0, 3)) {
        edges.push({
          source: action.id,
          target: neighbor.id,
          type: 'data_flow',
          weight: 0.5,
        });
      }
    }

    const firstAction: AgentAction | undefined = actions[0];
    return {
      nodes,
      edges,
      metadata: {
        agentId: (firstAction?.metadata?.agentId as string) || 'unknown',
        sessionId: (firstAction?.metadata?.sessionId as string) || 'unknown',
        actionCount: actions.length,
        timeWindow:
          actions.length > 0 ? [Math.min(...actions.map((a) => a.timestamp)), Math.max(...actions.map((a) => a.timestamp))] : [0, 0],
      },
    };
  }

  async classify(graph: ComputationalGraph): Promise<AnomalyScore> {
    let nodeFeatures: number[][] = graph.nodes.map((n) => n.features);
    const adjacencyMatrix: number[][] = this._buildAdjacencyMatrix(graph);

    for (let layer = 0; layer < this._gnnLayers; layer++) {
      nodeFeatures = await this._messagePass(nodeFeatures, adjacencyMatrix, layer);
    }

    const perNodeScores: Map<string, number> = new Map();
    for (let i = 0; i < graph.nodes.length; i++) {
      perNodeScores.set(graph.nodes[i].id, nodeFeatures[i][0]);
    }

    const anomalousSubgraphs: Subgraph[] = this._findAnomalousSubgraphs(graph, perNodeScores);

    const globalScore: number = Math.max(
      0,
      Math.min(1, anomalousSubgraphs.reduce((s, sg) => s + (sg.anomalyScore ?? 0), 0) / Math.max(1, anomalousSubgraphs.length)),
    );

    return {
      globalScore,
      perNodeScores: Object.fromEntries(perNodeScores),
      anomalousSubgraphs,
      explanation: this._generateExplanation(globalScore, anomalousSubgraphs),
    } as unknown as AnomalyScore;
  }

  async detectAnomalies(actions: AgentAction[]): Promise<AnomalyReport> {
    const graph: ComputationalGraph = this.buildGraph(actions);
    const anomaly: AnomalyScore = await this.classify(graph);

    return {
      detected: (anomaly.globalScore ?? 0) > this._anomalyThreshold,
      confidence: anomaly.globalScore ?? 0,
      graphComplexity: {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        density: graph.nodes.length > 0 ? (2 * graph.edges.length) / (graph.nodes.length * (graph.nodes.length - 1)) : 0,
      },
      attackClassification:
        (anomaly.globalScore ?? 0) > 0.9 ? 'confirmed' : (anomaly.globalScore ?? 0) > this._anomalyThreshold ? 'suspicious' : 'normal',
      anomalousNodes: [],
    } as unknown as AnomalyReport;
  }

  private async _messagePass(features: number[][], adjacency: number[][], layer: number): Promise<number[][]> {
    const n: number = features.length;
    const newFeatures: number[][] = Array.from({ length: n }, () => new Array(this._embeddingDim).fill(0));

    for (let i = 0; i < n; i++) {
      const neighbors: number[] = this._getNeighbors(adjacency, i);
      const aggregated: number =
        neighbors.length > 0 ? neighbors.reduce((s, j) => s + features[j][layer % features[0].length], 0) / neighbors.length : 0;
      const selfFeature: number = features[i][layer % features[0].length];
      newFeatures[i][layer % this._embeddingDim] = Math.tanh(selfFeature + aggregated);
    }

    return newFeatures;
  }

  private _buildAdjacencyMatrix(graph: ComputationalGraph): number[][] {
    const n: number = graph.nodes.length;
    const adj: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const nodeIndex: Map<string, number> = new Map(graph.nodes.map((n, i) => [n.id, i]));

    for (const edge of graph.edges) {
      const s: number | undefined = nodeIndex.get(edge.source);
      const t: number | undefined = nodeIndex.get(edge.target);
      if (s !== undefined && t !== undefined) {
        adj[s][t] = edge.weight;
      }
    }

    return adj;
  }

  private _getNeighbors(adjacency: number[][], nodeIdx: number): number[] {
    const neighbors: number[] = [];
    for (let j = 0; j < adjacency.length; j++) {
      if (adjacency[nodeIdx][j] > 0) neighbors.push(j);
    }
    return neighbors;
  }

  private _findAnomalousSubgraphs(graph: ComputationalGraph, perNodeScores: Map<string, number>): Subgraph[] {
    const subgraphs: Subgraph[] = [];
    const visited: Set<string> = new Set();

    for (const node of graph.nodes) {
      if (visited.has(node.id)) continue;
      const score: number = perNodeScores.get(node.id) || 0;
      if (score < this._anomalyThreshold) continue;

      const component: string[] = [];
      const queue: string[] = [node.id];

      while (queue.length > 0) {
        const current: string = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        component.push(current);

        const nodeScore: number = perNodeScores.get(current) || 0;
        if (nodeScore >= this._anomalyThreshold) {
          const neighborIds: string[] = graph.edges
            .filter((e) => e.source === current || e.target === current)
            .map((e) => (e.source === current ? e.target : e.source));
          for (const neighbor of neighborIds) {
            if (!visited.has(neighbor)) queue.push(neighbor);
          }
        }
      }

      if (component.length > 0) {
        subgraphs.push({
          nodes: component,
          edges: [],
          score: component.reduce((s, id) => s + (perNodeScores.get(id) || 0), 0) / component.length,
          anomalyScore: component.reduce((s, id) => s + (perNodeScores.get(id) || 0), 0) / component.length,
          attackType: this._classifyAttackSubgraph(component, graph),
        } as Subgraph);
      }
    }

    return subgraphs;
  }

  private _classifyAttackSubgraph(component: string[], graph: ComputationalGraph): string {
    const types: string[] = component.map((id) => graph.nodes.find((n) => n.id === id)?.type || 'unknown');
    if (types.includes('eval') && types.includes('network')) return 'remote_code_execution';
    if (types.includes('spawn') && types.includes('execute')) return 'shell_injection';
    if (types.includes('read') && types.includes('network')) return 'data_exfiltration';
    if (types.filter((t) => t === 'execute').length > 3) return 'mass_execution_attack';
    return 'anomalous_action_sequence';
  }

  private _generateExplanation(globalScore: number, subgraphs: Subgraph[]): string {
    if (subgraphs.length === 0) return 'No anomalous patterns detected';
    const top: Subgraph = subgraphs.sort((a, b) => (b.anomalyScore ?? 0) - (a.anomalyScore ?? 0))[0];
    return `Detected ${subgraphs.length} anomalous subgraph(s). Highest: ${top.attackType} (${((top.anomalyScore ?? 0) * 100).toFixed(0)}% confidence) involving ${top.nodes.length} action(s)`;
  }

  private _encodeAction(action: AgentAction): number[] {
    const typeIndex: Record<string, number> = {
      read: 0,
      write: 1,
      execute: 2,
      network: 3,
      spawn: 4,
      eval: 5,
      fs: 6,
      env: 7,
      auth: 8,
      unknown: 9,
    };
    const features: number[] = new Array(this._embeddingDim).fill(0);
    features[typeIndex[action.type] || 9] = 1;
    features[10] = action.timestamp / Date.now();
    features[11] = (this._hashString(action.target) % 100) / 100;
    return features;
  }

  private _generateNormalGraph(): ComputationalGraph {
    const normalTypes: string[] = ['read', 'write', 'fs', 'auth'];
    const actions: AgentAction[] = Array.from({ length: 5 + Math.floor(Math.random() * 5) }, (_, i) => ({
      id: `normal-${crypto.randomUUID()}`,
      type: normalTypes[Math.floor(Math.random() * normalTypes.length)] as AgentAction['type'],
      target: '/legitimate/path',
      timestamp: Date.now() + i * 1000,
      parentActionId: i > 0 ? `normal-parent-${i - 1}` : undefined,
      metadata: { sessionId: 'normal-session' },
    }));
    return this.buildGraph(actions);
  }

  private _hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const char: number = s.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
