import { DependencyGraph } from './dependency-graph';
import { createLogger } from '@ideia/logger';
const logger = createLogger('impact-analyzer');

export interface ChangeImpact {
  nodeId: string;
  directImpact: string[];
  transitiveImpact: string[];
  totalAffected: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedTypes: Record<string, number>;
}

export class ImpactAnalyzer {
  private maxDepth = 5;

  analyzeImpact(graph: DependencyGraph, nodeId: string): ChangeImpact {
    return this.analyzeChange(graph, nodeId);
  }

  analyzeChange(graph: DependencyGraph, nodeId: string): ChangeImpact {
    const allAffected = this._bfsAffected(graph, nodeId);

    const directImpact: string[] = [];
    const directEdges = graph.getDependents(nodeId);
    for (const edge of directEdges) {
      if (edge.from !== nodeId && !directImpact.includes(edge.from)) {
        directImpact.push(edge.from);
      }
    }

    const transitiveImpact: string[] = [];
    for (const id of allAffected) {
      if (id !== nodeId && !directImpact.includes(id)) {
        transitiveImpact.push(id);
      }
    }

    const riskLevel = this._calculateRisk(allAffected.length, this.maxDepth);
    const affectedTypes = this._categorizeAffected(graph, allAffected);

    return {
      nodeId,
      directImpact,
      transitiveImpact,
      totalAffected: allAffected.length,
      riskLevel,
      affectedTypes,
    };
  }

  private _bfsAffected(graph: DependencyGraph, start: string, maxDepth?: number): string[] {
    const depth = maxDepth ?? this.maxDepth;
    const visited = new Set<string>();
    const queue: { id: string; dist: number }[] = [{ id: start, dist: 0 }];
    visited.add(start);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      if (current.dist >= depth) {
        continue;
      }
      const dependents = graph.getDependents(current.id);
      for (const edge of dependents) {
        if (!visited.has(edge.from)) {
          visited.add(edge.from);
          queue.push({ id: edge.from, dist: current.dist + 1 });
        }
      }
    }

    return Array.from(visited);
  }

  private _calculateRisk(totalAffected: number, _maxDepth: number): 'low' | 'medium' | 'high' | 'critical' {
    if (totalAffected <= 0) {
      return 'low';
    }
    if (totalAffected < 5) {
      return 'low';
    }
    if (totalAffected <= 15) {
      return 'medium';
    }
    if (totalAffected <= 50) {
      return 'high';
    }
    return 'critical';
  }

  private _categorizeAffected(graph: DependencyGraph, nodeIds: string[]): Record<string, number> {
    const categories: Record<string, number> = {};
    for (const id of nodeIds) {
      const node = graph.getNode(id);
      if (node) {
        const t = node.type;
        if (categories[t] === undefined) {
          categories[t] = 0;
        }
        categories[t]++;
      }
    }
    return categories;
  }
}
