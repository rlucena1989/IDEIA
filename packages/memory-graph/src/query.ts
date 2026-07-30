import { MemoryGraph } from './graph';
import { createLogger } from '@ideia/logger';
import { GraphNode } from './types';
const logger = createLogger('query');

export interface QueryResult {
  type: string;
  data: unknown;
  took: number;
}

export class GraphQueryEngine {
  constructor(private graph: MemoryGraph) {}

  findPath(fromLabel: string, toLabel: string, maxDepth = 10): QueryResult {
    const start = Date.now();
    const fromNode = this.findNodeByLabel(fromLabel);
    const toNode = this.findNodeByLabel(toLabel);
    if (!fromNode || !toNode) {
      return { type: 'path', data: { error: 'Node not found' }, took: Date.now() - start };
    }
    const paths = this.graph.findPath(fromNode.id, toNode.id, maxDepth);
    return {
      type: 'path',
      data: { from: fromNode.label, to: toNode.label, paths: paths.map(p => ({
        score: p.score,
        nodeCount: p.nodes.length,
        nodes: p.nodes.map((n: any) => ({ id: n.id, label: n.label, type: n.type })),
        relations: p.edges.map(e => e.relation),
      }))},
      took: Date.now() - start,
    };
  }

  subgraph(centerLabel: string, depth = 2): QueryResult {
    const start = Date.now();
    const center = this.findNodeByLabel(centerLabel);
    if (!center) {
      return { type: 'subgraph', data: { error: 'Node not found' }, took: Date.now() - start };
    }
    const sub = (this.graph as any).extractSubgraph(center.id, depth);
    return {
      type: 'subgraph',
      data: {
        center: center.label,
        depth,
        nodeCount: sub.nodes.length,
        edgeCount: sub.edges.length,
        nodes: sub.nodes.map((n: any) => ({ id: n.id, label: n.label, type: n.type })),
        edges: sub.edges.map((e: any) => ({ source: e.source, target: e.target, relation: e.relation })),
      },
      took: Date.now() - start,
    };
  }

  timeline(timeStart: number, timeEnd?: number): QueryResult {
    const start = Date.now();
    const end = timeEnd || Date.now();
    const allNodes = (this.graph as any).getAllNodes();
    const nodes = allNodes.filter((n: any) => n.timestamp >= timeStart && n.timestamp <= end).slice(0, 100);
    const timeline = nodes.map((n: any) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      timestamp: n.timestamp,
      date: new Date(n.timestamp).toISOString(),
    }));
    return {
      type: 'timeline',
      data: { from: timeStart, to: end, count: timeline.length, entries: timeline },
      took: Date.now() - start,
    };
  }

  similarity(type?: string, tag?: string): QueryResult {
    const start = Date.now();
    const nodes = this.graph.query({ type, tag }, 50);
    const groups = new Map<string, { nodes: GraphNode[]; avgWeight: number }>();

    for (const node of nodes) {
      const key = tag || type || 'all';
      if (!groups.has(key)) groups.set(key, { nodes: [], avgWeight: 0 });
      const group = groups.get(key);
      if (group) group.nodes.push(node);
    }

    for (const [, group] of groups) {
      const total = group.nodes.length;
      group.avgWeight = total > 0 ? 1 : 0;
    }

    const result = Array.from(groups.entries()).map(([k, v]) => ({
      group: k,
      count: v.nodes.length,
      avgWeight: v.avgWeight,
      nodes: v.nodes.slice(0, 10).map((n: any) => ({ id: n.id, label: n.label, type: n.type })),
    }));

    return { type: 'similarity', data: result, took: Date.now() - start };
  }

  topology(): QueryResult {
    const start = Date.now();
    const topo = (this.graph as any).getTopology();
    return { type: 'topology', data: topo, took: Date.now() - start };
  }

  queryLanguage(input: string): QueryResult {
    const start = Date.now();
    const filters: { type?: string; tag?: string; search?: string } = {};
    let limit: number | undefined;

    const tokens = input.match(/\w+:.+?(?=\s+\w+:|$)/g) || [input];
    for (const token of tokens) {
      const colonIdx = token.indexOf(':');
      const key = token.slice(0, colonIdx);
      const value = token.slice(colonIdx + 1).trim();
      if (!value || !key) continue;
      switch (key.toUpperCase()) {
        case 'TYPE': filters.type = value; break;
        case 'TAG': filters.tag = value; break;
        case 'SEARCH': filters.search = value; break;
        case 'LIMIT': limit = parseInt(value, 10) || undefined; break;
        case 'SINCE': break;
        case 'DEPTH': {
          const parts = value.split('->');
          if (parts.length >= 2 && parts[0] && parts[1]) {
            return this.findPath(parts[0].trim(), parts.slice(1).join('->').trim(), 5);
          }
          return this.subgraph(value, 2);
        }
      }
    }

    const nodes = this.graph.query(filters, limit);
    return {
      type: 'query',
      data: { parsed: { filters, limit }, count: nodes.length, nodes: nodes.map((n: any) => ({
        id: n.id, label: n.label, type: n.type, tags: n.tags,
      }))},
      took: Date.now() - start,
    };
  }

  private findNodeByLabel(label: string): GraphNode | undefined {
    const lower = label.toLowerCase();
    return (this.graph as any).getAllNodes().find(
      (n: any) => n.label.toLowerCase() === lower || n.id === label,
    );
  }
}
