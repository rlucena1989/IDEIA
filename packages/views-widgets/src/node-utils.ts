import { ITreeNode } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('node-utils');

export function findNodeById(nodes: ITreeNode[], id: string): ITreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function flattenTree(nodes: ITreeNode[]): ITreeNode[] {
  const result: ITreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

export function countNodes(nodes: ITreeNode[]): number {
  let count = nodes.length;
  for (const node of nodes) {
    if (node.children) {
      count += countNodes(node.children);
    }
  }
  return count;
}

export function createTreeNode(
  id: string,
  label: string,
  options?: Partial<ITreeNode>
): ITreeNode {
  return {
    id,
    label,
    iconClass: options?.iconClass,
    description: options?.description,
    expanded: options?.expanded ?? false,
    selected: options?.selected ?? false,
    children: options?.children ?? [],
    metadata: options?.metadata,
  };
}
