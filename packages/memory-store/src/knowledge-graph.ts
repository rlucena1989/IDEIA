/**
 * knowledge-graph.ts — Knowledge Graph Interno (Item 18)
 *
 * Graph interno JSON com nós = projetos/módulos/decisões/arquivos
 * e arestas = depende/implementa/substitui/causou.
 * Permite análise de impacto e rastreabilidade.
 */

import { randomUUID } from 'crypto';

export interface GraphNode {
  id: string;
  type: 'project' | 'module' | 'decision' | 'file' | 'agent' | 'pattern';
  name: string;
  properties: Record<string, unknown>;
  createdAt: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: 'depends_on' | 'implements' | 'replaces' | 'caused' | 'references' | 'deployed_to' | 'co_occurs';
  properties?: Record<string, unknown>;
}

export interface ImpactAnalysis {
  node: GraphNode;
  directDependents: GraphNode[];
  transitiveDependents: GraphNode[];
  depth: number;
}

export class KnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];

  addNode(node: Omit<GraphNode, 'id' | 'createdAt'>): string {
    const id = randomUUID().slice(0, 12);
    this.nodes.set(id, { ...node, id, createdAt: new Date().toISOString() });
    return id;
  }

  addEdge(edge: GraphEdge): void {
    if (this.nodes.has(edge.source) && this.nodes.has(edge.target)) {
      this.edges.push(edge);
    }
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  queryNodes(type?: string, name?: string): GraphNode[] {
    return Array.from(this.nodes.values()).filter(n => {
      if (type && n.type !== type) return false;
      if (name && !n.name.toLowerCase().includes(name.toLowerCase())) return false;
      return true;
    });
  }

  getDependencies(id: string): GraphNode[] {
    const depIds = this.edges.filter(e => e.source === id && e.relation === 'depends_on').map(e => e.target);
    return depIds.map(d => this.nodes.get(d)).filter(Boolean) as GraphNode[];
  }

  getDependents(id: string): GraphNode[] {
    const depIds = this.edges.filter(e => e.target === id).map(e => e.source);
    return depIds.map(d => this.nodes.get(d)).filter(Boolean) as GraphNode[];
  }

  analyzeImpact(id: string): ImpactAnalysis {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node ${id} not found`);

    const directDependents = this.getDependents(id);
    const transitiveDependents: GraphNode[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string, depth: number) => {
      if (depth > 5 || visited.has(nodeId)) return;
      visited.add(nodeId);
      const dependents = this.getDependents(nodeId);
      for (const dep of dependents) {
        if (dep.id !== id && !transitiveDependents.find(d => d.id === dep.id)) {
          transitiveDependents.push(dep);
        }
        traverse(dep.id, depth + 1);
      }
    };
    traverse(id, 0);

    return { node, directDependents, transitiveDependents, depth: this.calculateDepth(id) };
  }

  exportGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return { nodes: Array.from(this.nodes.values()), edges: [...this.edges] };
  }

  queryNode(id: string): { node: GraphNode | undefined; neighbors: Array<{ node: GraphNode; edge: GraphEdge; direction: 'in' | 'out' }> } {
    const node = this.nodes.get(id);
    if (!node) return { node: undefined, neighbors: [] };
    const neighbors: Array<{ node: GraphNode; edge: GraphEdge; direction: 'in' | 'out' }> = [];
    for (const edge of this.edges) {
      if (edge.source === id) {
        const target = this.nodes.get(edge.target);
        if (target) neighbors.push({ node: target, edge, direction: 'out' });
      } else if (edge.target === id) {
        const source = this.nodes.get(edge.source);
        if (source) neighbors.push({ node: source, edge, direction: 'in' });
      }
    }
    return { node, neighbors };
  }

  traverse(startId: string, relation?: string, maxDepth = 10): Array<{ node: GraphNode; depth: number; path: string[] }> {
    const result: Array<{ node: GraphNode; depth: number; path: string[] }> = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number; path: string[] }> = [{ id: startId, depth: 0, path: [startId] }];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      const node = this.nodes.get(current.id);
      if (!node) continue;
      if (current.depth > 0 || current.id === startId) {
        result.push({ node, depth: current.depth, path: current.path });
      }
      if (current.depth >= maxDepth) continue;
      for (const edge of this.edges) {
        if (relation && edge.relation !== relation) continue;
        if (edge.source === current.id) {
          if (!visited.has(edge.target)) {
            queue.push({ id: edge.target, depth: current.depth + 1, path: [...current.path, edge.target] });
          }
        } else if (edge.target === current.id) {
          if (!visited.has(edge.source)) {
            queue.push({ id: edge.source, depth: current.depth + 1, path: [...current.path, edge.source] });
          }
        }
      }
    }
    return result;
  }

  searchSimilar(query: string, limit?: number): GraphNode[] {
    const q = query.toLowerCase();
    const matches = Array.from(this.nodes.values()).filter(n =>
      n.name.toLowerCase().includes(q) ||
      (typeof n.properties?.type === 'string' && (n.properties.type as string).toLowerCase().includes(q))
    );
    return limit ? matches.slice(0, limit) : matches;
  }

  getStats(): { nodes: number; edges: number; density: number; nodeTypes: Record<string, number> } {
    const nodeTypes: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      nodeTypes[node.type] = (nodeTypes[node.type] ?? 0) + 1;
    }
    const n = this.nodes.size;
    const e = this.edges.length;
    const density = n < 2 ? 0 : e / (n * (n - 1));
    return { nodes: n, edges: e, density, nodeTypes };
  }

  findByType(type: string): GraphNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  private calculateDepth(id: string): number {
    let depth = 0;
    let current = id;
    const visited = new Set<string>();
    while (current) {
      visited.add(current);
      const deps = this.getDependencies(current);
      if (deps.length === 0) break;
      current = deps[0].id;
      if (visited.has(current)) break;
      depth++;
    }
    return depth;
  }
}
