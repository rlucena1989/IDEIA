import { ThoughtNode } from './thought-node';
import { createLogger } from '@ideia/logger';
const logger = createLogger('thought-path');

export class ThoughtPath {
  public path: ThoughtNode[];
  public score: number;

  constructor(path: ThoughtNode[], score: number) {
    this.path = path;
    this.score = score;
  }

  get length(): number {
    return this.path.length;
  }

  get lastNode(): ThoughtNode | undefined {
    if (this.path.length === 0) return undefined;
    return this.path[this.path.length - 1];
  }

  get avgNodeScore(): number {
    if (this.path.length === 0) return 0;
    return this.path.reduce((sum, n) => sum + n.value, 0) / this.path.length;
  }

  static buildFromLeaf(leaf: ThoughtNode, nodeMap: Map<string, ThoughtNode>): ThoughtPath {
    const path: ThoughtNode[] = [];
    const visited = new Set<string>();
    let current: ThoughtNode | undefined = leaf;

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift(current);
      if (current.parentId && nodeMap.has(current.parentId)) {
        current = nodeMap.get(current.parentId);
      } else {
        current = undefined;
      }
    }

    const score = path.reduce((sum, n) => sum + n.value, 0) / Math.max(path.length, 1);
    return new ThoughtPath(path, score);
  }

  isAcyclic(): boolean {
    const visited = new Set<string>();
    for (const node of this.path) {
      if (visited.has(node.id)) return false;
      visited.add(node.id);
    }
    return true;
  }
}
