export interface TaskNode {
  id: string;
  dependsOn: string[];
}

export interface TaskNodeWithDuration extends TaskNode {
  estimatedDurationMs: number;
}

export interface CriticalPathResult {
  path: string[];
  totalDurationMs: number;
  slack: Record<string, number>;
}

export function topologicalSort(nodes: TaskNode[]): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();
  const map = new Map(nodes.map(node => [node.id, node]));

  function visit(id: string) {
    if (visited.has(id)) return;
    if (temp.has(id)) return;

    temp.add(id);
    const node = map.get(id);
    if (node) {
      for (const dep of node.dependsOn) visit(dep);
    }
    temp.delete(id);
    visited.add(id);
    result.push(id);
  }

  for (const node of nodes) visit(node.id);
  return result;
}

export function criticalPath(nodes: TaskNodeWithDuration[]): CriticalPathResult {
  const map = new Map(nodes.map(n => [n.id, n]));
  const sorted = topologicalSort(nodes);

  const earliestStart: Record<string, number> = {};
  const earliestFinish: Record<string, number> = {};
  const latestStart: Record<string, number> = {};
  const latestFinish: Record<string, number> = {};

  for (const id of sorted) {
    const node = map.get(id);
    if (!node) continue;
    const maxDep = node.dependsOn.reduce((max, depId) => Math.max(max, earliestFinish[depId] ?? 0), 0);
    earliestStart[id] = maxDep;
    earliestFinish[id] = maxDep + node.estimatedDurationMs;
  }

  const totalDuration = Math.max(...Object.values(earliestFinish), 0);
  for (const id of sorted) {
    latestFinish[id] = totalDuration;
    latestStart[id] = totalDuration;
  }

  for (let i = sorted.length - 1; i >= 0; i--) {
    const id = sorted[i];
    const node = map.get(id);
    if (!node) continue;
    const successors = nodes.filter(n => n.dependsOn.includes(id));
    const minSucc = successors.reduce((min, succ) => Math.min(min, latestStart[succ.id] ?? totalDuration), totalDuration);
    latestFinish[id] = minSucc;
    latestStart[id] = minSucc - (node.estimatedDurationMs || 0);
  }

  const slack: Record<string, number> = {};
  for (const id of sorted) {
    slack[id] = Math.max(0, (latestStart[id] ?? 0) - (earliestStart[id] ?? 0));
  }

  const path = sorted.filter(id => slack[id] < 0.001);
  const totalDurationMs = Math.round(totalDuration);

  return { path, totalDurationMs, slack };
}

export function estimateTotalDuration(nodes: TaskNodeWithDuration[]): number {
  if (nodes.length === 0) return 0;
  return criticalPath(nodes).totalDurationMs;
}
