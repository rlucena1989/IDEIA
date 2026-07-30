import { PlannedStep, StepDependency } from './types';
import { createLogger } from '@ideia/logger';

export class DependencyAnalyzer {
  analyze(steps: PlannedStep[]): {
    steps: PlannedStep[];
    criticalPath: string[];
    parallelGroups: string[][];
    cycles: string[][];
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    const graph = this.buildGraph(steps);
    const cycles = this.detectCycles(graph);
    const criticalPath = this.findCriticalPath(graph, steps);
    const parallelGroups = this.findParallelGroups(graph, steps);

    if (cycles.length > 0) {
      for (const cycle of cycles) {
        suggestions.push(`Ciclo detectado: ${cycle.join(' -> ')}`);
      }
    }

    if (parallelGroups.length > 0) {
      for (const group of parallelGroups) {
        suggestions.push(`Steps paralelizáveis: ${group.join(', ')}`);
      }
    }

    return { steps, criticalPath, parallelGroups, cycles, suggestions };
  }

  private buildGraph(steps: PlannedStep[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    for (const step of steps) {
      const deps = step.dependencies
        .filter(d => d.type === 'requires' || d.type === 'blocked_by')
        .map(d => d.stepId);
      graph.set(step.id, deps);
    }
    return graph;
  }

  private detectCycles(graph: Map<string, string[]>): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];
    const path: string[] = [];

    const dfs = (node: string): void => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), node]);
        }
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = graph.get(node) ?? [];
      for (const dep of deps) {
        dfs(dep);
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const node of graph.keys()) {
      dfs(node);
    }

    return cycles;
  }

  private findCriticalPath(graph: Map<string, string[]>, _steps: PlannedStep[]): string[] {
    const inDegree = new Map<string, number>();
    for (const [node, deps] of graph) {
      if (!inDegree.has(node)) inDegree.set(node, 0);
      for (const _dep of deps) {
        inDegree.set(node, (inDegree.get(node) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) queue.push(node);
    }

    const topo: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift() as string;
      topo.push(node);
    }

    return topo;
  }

  private findParallelGroups(graph: Map<string, string[]>, steps: PlannedStep[]): string[][] {
    const byRole = new Map<string, string[]>();
    for (const step of steps) {
      const existing = byRole.get(step.agentRole) ?? [];
      existing.push(step.id);
      byRole.set(step.agentRole, existing);
    }

    const groups: string[][] = [];
    for (const [, ids] of byRole) {
      if (ids.length > 1) {
        const independent = this.filterIndependent(ids, graph);
        if (independent.length > 1) {
          groups.push(independent);
        }
      }
    }

    return groups;
  }

  private filterIndependent(ids: string[], graph: Map<string, string[]>): string[] {
    const independent: string[] = [];
    for (const id of ids) {
      const deps = graph.get(id) ?? [];
      const dependsOnSameRole = deps.some(d => ids.includes(d));
      if (!dependsOnSameRole) {
        independent.push(id);
      }
    }
    return independent;
  }
}
