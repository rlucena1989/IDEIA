import { DependencyGraph, DependencyEdge } from './dependency-graph';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cycle-detector');

export interface CycleInfo {
  nodes: string[];
  edges: DependencyEdge[];
  length: number;
}

type Color = 'white' | 'gray' | 'black';

export class CycleDetector {
  findCycles(graph: DependencyGraph): CycleInfo[] {
    return this.detectCycles(graph);
  }

  detectCycles(graph: DependencyGraph): CycleInfo[] {
    const cycles: CycleInfo[] = [];
    const allNodes = graph.getAllNodes();
    const color = new Map<string, Color>();
    const parent = new Map<string, string | null>();

    for (const node of allNodes) {
      color.set(node.id, 'white');
      parent.set(node.id, null);
    }

    for (const node of allNodes) {
      if (color.get(node.id) === 'white') {
        this._dfs(graph, node.id, color, parent, cycles);
      }
    }

    return this._deduplicateCycles(cycles);
  }

  hasCycle(graph: DependencyGraph): boolean {
    return this.detectCycles(graph).length > 0;
  }

  findShortestCycle(graph: DependencyGraph): CycleInfo | null {
    const cycles = this.detectCycles(graph);
    if (cycles.length === 0) {
      return null;
    }
    let shortest = cycles[0];
    for (const cycle of cycles) {
      if (cycle.length < shortest.length) {
        shortest = cycle;
      }
    }
    return shortest;
  }

  findCyclesInvolving(graph: DependencyGraph, nodeId: string): CycleInfo[] {
    const cycles = this.detectCycles(graph);
    const result: CycleInfo[] = [];
    for (const cycle of cycles) {
      if (cycle.nodes.includes(nodeId)) {
        result.push(cycle);
      }
    }
    return result;
  }

  private _dfs(
    graph: DependencyGraph,
    current: string,
    color: Map<string, Color>,
    parent: Map<string, string | null>,
    cycles: CycleInfo[]
  ): void {
    color.set(current, 'gray');

    const edges = graph.getDependencies(current);
    for (const edge of edges) {
      const neighborColor = color.get(edge.to);
      if (neighborColor === 'gray') {
        const cyclePath = this._buildPath(parent, edge.to, current);
        cyclePath.push(edge.to);
        const cycleEdges = this._extractEdges(graph, cyclePath);
        cycles.push({
          nodes: cyclePath,
          edges: cycleEdges,
          length: cyclePath.length - 1,
        });
      } else if (neighborColor === 'white') {
        parent.set(edge.to, current);
        this._dfs(graph, edge.to, color, parent, cycles);
      }
    }

    color.set(current, 'black');
  }

  private _buildPath(
    parent: Map<string, string | null>,
    start: string,
    end: string
  ): string[] {
    const path: string[] = [];
    let current: string | null = end;
    while (current !== null && current !== start) {
      path.unshift(current);
      current = parent.get(current) ?? null;
    }
    path.unshift(start);
    return path;
  }

  private _extractEdges(graph: DependencyGraph, path: string[]): DependencyEdge[] {
    const result: DependencyEdge[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const node = path[i];
      if (!node) continue;
      const edges = graph.getDependencies(node);
      for (const edge of edges) {
        if (edge.to === path[i + 1]) {
          result.push(edge);
        }
      }
    }
    const lastNode = path[path.length - 1];
    if (!lastNode) return result;
    const lastEdges = graph.getDependencies(lastNode);
    for (const edge of lastEdges) {
      if (edge.to === path[0]) {
        result.push(edge);
      }
    }
    return result;
  }

  private _deduplicateCycles(cycles: CycleInfo[]): CycleInfo[] {
    const seen = new Set<string>();
    const result: CycleInfo[] = [];
    for (const cycle of cycles) {
      const sorted = [...cycle.nodes].sort();
      const key = sorted.join('->');
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cycle);
      }
    }
    return result;
  }
}
