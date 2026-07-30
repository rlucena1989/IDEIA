import { v4 as uuid } from 'uuid';
import { createLogger } from '@ideia/logger';
import { GraphNode, GraphEdge, GraphPath } from './types';

export class MemoryGraph {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();

  addNode(node: Omit<GraphNode, 'id' | 'timestamp'>): string {
    const id = uuid();
    const full: GraphNode = { ...node, id, timestamp: Date.now() };
    this.nodes.set(id, full);
    return id;
  }

  addEdge(edge: Omit<GraphEdge, 'timestamp'>): void {
    const key = `${edge.source}->${edge.target}::${edge.relation}`;
    const full: GraphEdge = { ...edge, timestamp: Date.now() };
    this.edges.set(key, full);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  query(
    filters: { type?: string; tag?: string; search?: string },
    limit?: number,
  ): GraphNode[] {
    let results = Array.from(this.nodes.values());

    if (filters.type) {
      results = results.filter(n => n.type === filters.type);
    }
    if (filters.tag) {
      if (filters.tag) results = results.filter(n => n.tags.includes(filters.tag!));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        n =>
          n.label.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q)),
      );
    }

    results.sort((a, b) => b.timestamp - a.timestamp);

    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  findPath(from: string, to: string, maxDepth = 5): GraphPath[] {
    const adjacency = new Map<string, GraphEdge[]>();
    for (const edge of this.edges.values()) {
      const list = adjacency.get(edge.source) || [];
      list.push(edge);
      adjacency.set(edge.source, list);
    }

    const paths: GraphPath[] = [];

    function dfs(
      current: string,
      target: string,
      visited: Set<string>,
      nodePath: GraphNode[],
      edgePath: GraphEdge[],
      depth: number,
      nodeMap: Map<string, GraphNode>,
    ) {
      if (depth > maxDepth) return;
      if (current === target) {
        const score = edgePath.reduce((s, e) => s + e.weight, 0) / Math.max(edgePath.length, 1);
        paths.push({ nodes: [...nodePath], edges: [...edgePath], score });
        return;
      }

      const neighbors = adjacency.get(current) || [];
      for (const edge of neighbors) {
        if (visited.has(edge.target)) continue;
        visited.add(edge.target);
        const nextNode = nodeMap.get(edge.target);
        if (nextNode) nodePath.push(nextNode);
        edgePath.push(edge);
        dfs(edge.target, target, visited, nodePath, edgePath, depth + 1, nodeMap);
        edgePath.pop();
        if (nextNode) nodePath.pop();
        visited.delete(edge.target);
      }
    }

    const start = this.nodes.get(from);
    const end = this.nodes.get(to);
    if (!start || !end) return [];

    dfs(from, to, new Set([from]), [start], [], 0, this.nodes);

    paths.sort((a, b) => b.score - a.score);
    return paths;
  }

  removeNode(id: string): boolean {
    const existed = this.nodes.has(id);
    this.nodes.delete(id);
    for (const [key, edge] of this.edges) {
      if (edge.source === id || edge.target === id) {
        this.edges.delete(key);
      }
    }
    return existed;
  }

  getStats(): { nodeCount: number; edgeCount: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      byType[node.type] = (byType[node.type] || 0) + 1;
    }
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      byType,
    };
  }
}
