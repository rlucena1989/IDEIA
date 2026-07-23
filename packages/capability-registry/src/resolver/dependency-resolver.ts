import type { Capability } from '../types/capability';
import type { ICapabilityRegistry } from '../registry/registry.interface';
import type { IDependencyResolver, DependencyGraph, ResolutionResult } from './resolver.interface';

export class CapabilityDependencyResolver implements IDependencyResolver {
  constructor(private registry: ICapabilityRegistry) {}

  async resolve(capabilityIds: string[]): Promise<ResolutionResult> {
    const graph: DependencyGraph = { nodes: new Map(), edges: new Map() };
    const missing: string[] = [];
    const versionConflicts: string[] = [];
    const visited = new Set<string>();
    const queue = [...capabilityIds];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const cap = await this.registry.get(id);
      if (!cap) { missing.push(id); continue; }
      graph.nodes.set(id, cap);
      const deps = cap.dependsOn.map(d => d.id);
      graph.edges.set(id, deps);
      queue.push(...deps);
    }

    const cycles = this.findCycles(graph);
    let order: string[] = [];
    if (cycles.length === 0) order = this.topologicalSort(graph);

    const versionMap = new Map<string, string>();
    for (const [id, cap] of graph.nodes) {
      if (versionMap.has(id) && versionMap.get(id) !== cap.version) versionConflicts.push(`${id}: ${versionMap.get(id)} vs ${cap.version}`);
      versionMap.set(id, cap.version);
    }

    return { success: missing.length === 0 && cycles.length === 0 && versionConflicts.length === 0, order, graph, cycles, missing, versionConflicts };
  }

  async validate(capability: Capability): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    for (const dep of capability.dependsOn) {
      const resolved = await this.registry.get(dep.id);
      if (!resolved) errors.push(`Dependency not found: ${dep.id}@${dep.version}`);
      else if (resolved.status === 'deprecated') errors.push(`Dependency ${dep.id} is deprecated`);
    }
    return { valid: errors.length === 0, errors };
  }

  async getDependencyGraph(capabilityId: string): Promise<DependencyGraph> { return (await this.resolve([capabilityId])).graph; }
  async detectCycles(capabilityId: string): Promise<string[][]> { return (await this.resolve([capabilityId])).cycles; }

  private findCycles(graph: DependencyGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) cycles.push([...path.slice(cycleStart), node]);
        return;
      }
      if (visited.has(node)) return;
      visited.add(node);
      recursionStack.add(node);
      path.push(node);
      for (const dep of graph.edges.get(node) || []) if (graph.nodes.has(dep)) dfs(dep);
      path.pop();
      recursionStack.delete(node);
    };

    for (const node of graph.nodes.keys()) if (!visited.has(node)) dfs(node);
    return cycles;
  }

  private topologicalSort(graph: DependencyGraph): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const dfs = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);
    for (const dep of graph.edges.get(node) || []) if (graph.nodes.has(dep)) dfs(dep);
        result.push(node);
    };
    for (const node of graph.nodes.keys()) dfs(node);
    return result;
  }
}
