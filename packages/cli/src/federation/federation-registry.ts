import { ContextNode } from './federation-types';

export class FederationRegistry {
  private nodes: ContextNode[] = [];

  register(node: ContextNode): void {
    const idx = this.nodes.findIndex(n => n.nodeId === node.nodeId);
    if (idx >= 0) {
      this.nodes[idx] = { ...node, lastSyncAt: new Date().toISOString() };
      return;
    }
    this.nodes.push(node);
  }

  remove(nodeId: string): void {
    this.nodes = this.nodes.filter(n => n.nodeId !== nodeId);
  }

  list(): ContextNode[] {
    return [...this.nodes];
  }

  get(nodeId: string): ContextNode | undefined {
    return this.nodes.find(n => n.nodeId === nodeId);
  }

  listHealthy(): ContextNode[] {
    return this.nodes.filter(n => n.status === 'healthy');
  }

  count(): number {
    return this.nodes.length;
  }
}
