import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { EntityType, LinkRequest, Relationship, TraceEdge, TraceGraph, TraceLink, TraceNode, TracePath } from './types';

interface TraceRegistrySnapshot {
  links: [string, TraceLink][];
  indexBySource: [string, string[]][];
  indexByTarget: [string, string[]][];
}

export class TraceRegistry {
  private links: Map<string, TraceLink> = new Map();
  private indexBySource: Map<string, Set<string>> = new Map();
  private indexByTarget: Map<string, Set<string>> = new Map();

  link(request: LinkRequest): TraceLink {
    const link: TraceLink = {
      id: randomUUID(),
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      targetType: request.targetType,
      targetId: request.targetId,
      relationship: request.relationship,
      confidence: request.confidence ?? 1,
      createdAt: new Date().toISOString(),
      createdBy: request.createdBy,
      metadata: request.metadata,
    };

    this.links.set(link.id, link);

    const sourceKey = `${request.sourceType}:${request.sourceId}`;
    const targetKey = `${request.targetType}:${request.targetId}`;

    this.addToIndex(this.indexBySource, sourceKey, link.id);
    this.addToIndex(this.indexByTarget, targetKey, link.id);

    return link;
  }

  unlink(id: string): boolean {
    const link = this.links.get(id);
    if (!link) return false;

    this.links.delete(id);
    const sourceKey = `${link.sourceType}:${link.sourceId}`;
    const targetKey = `${link.targetType}:${link.targetId}`;
    this.removeFromIndex(this.indexBySource, sourceKey, id);
    this.removeFromIndex(this.indexByTarget, targetKey, id);
    return true;
  }

  getBySource(type: EntityType, id: string): TraceLink[] {
    const key = `${type}:${id}`;
    return this.getFromIndex(this.indexBySource, key);
  }

  getByTarget(type: EntityType, id: string): TraceLink[] {
    const key = `${type}:${id}`;
    return this.getFromIndex(this.indexByTarget, key);
  }

  getByEntity(type: EntityType, id: string): { outgoing: TraceLink[]; incoming: TraceLink[] } {
    return {
      outgoing: this.getBySource(type, id),
      incoming: this.getByTarget(type, id),
    };
  }

  getAll(): TraceLink[] {
    return Array.from(this.links.values());
  }

  getGraph(): TraceGraph {
    const nodeMap = new Map<string, TraceNode>();
    const edges: TraceEdge[] = [];

    for (const link of this.links.values()) {
      const sourceKey = `${link.sourceType}:${link.sourceId}`;
      const targetKey = `${link.targetType}:${link.targetId}`;

      if (!nodeMap.has(sourceKey)) {
        nodeMap.set(sourceKey, { id: link.sourceId, type: link.sourceType, label: sourceKey });
      }
      if (!nodeMap.has(targetKey)) {
        nodeMap.set(targetKey, { id: link.targetId, type: link.targetType, label: targetKey });
      }

      edges.push({
        source: link.sourceId,
        target: link.targetId,
        relationship: link.relationship,
        confidence: link.confidence,
      });
    }

    return { nodes: Array.from(nodeMap.values()), edges };
  }

  findPath(sourceType: EntityType, sourceId: string, targetType: EntityType, targetId: string, maxDepth = 5): TracePath | null {
    const visited = new Set<string>();
    const queue: { link: TraceLink; path: TraceLink[] }[] = [];

    const initialLinks = this.getBySource(sourceType, sourceId);
    for (const link of initialLinks) {
      queue.push({ link, path: [link] });
    }

    while (queue.length > 0) {
      const current = queue.shift() as (typeof queue)[number];
      const lastLink = current.link;
      const targetKey = `${lastLink.targetType}:${lastLink.targetId}`;

      if (lastLink.targetType === targetType && lastLink.targetId === targetId) {
        const totalConfidence = current.path.reduce((sum, l) => sum * l.confidence, 1);
        return { path: current.path, hops: current.path.length, totalConfidence };
      }

      if (current.path.length >= maxDepth) continue;

      if (!visited.has(targetKey)) {
        visited.add(targetKey);
        const nextLinks = this.getBySource(lastLink.targetType, lastLink.targetId);
        for (const nextLink of nextLinks) {
          queue.push({ link: nextLink, path: [...current.path, nextLink] });
        }
      }
    }

    return null;
  }

  count(): number {
    return this.links.size;
  }

  clear(): void {
    this.links.clear();
    this.indexBySource.clear();
    this.indexByTarget.clear();
  }

  save(filePath: string): void {
    const snapshot: TraceRegistrySnapshot = {
      links: Array.from(this.links.entries()),
      indexBySource: Array.from(this.indexBySource.entries()).map(([k, v]) => [k, Array.from(v)]),
      indexByTarget: Array.from(this.indexByTarget.entries()).map(([k, v]) => [k, Array.from(v)]),
    };
    writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  }

  static load(filePath: string): TraceRegistry {
    if (!existsSync(filePath)) return new TraceRegistry();
    const raw = readFileSync(filePath, 'utf-8');
    const snapshot: TraceRegistrySnapshot = JSON.parse(raw);
    const registry = new TraceRegistry();
    registry.links = new Map(snapshot.links);
    registry.indexBySource = new Map(snapshot.indexBySource.map(([k, v]) => [k, new Set(v)]));
    registry.indexByTarget = new Map(snapshot.indexByTarget.map(([k, v]) => [k, new Set(v)]));
    return registry;
  }

  private addToIndex(index: Map<string, Set<string>>, key: string, id: string): void {
    const set = index.get(key) || new Set();
    set.add(id);
    index.set(key, set);
  }

  private removeFromIndex(index: Map<string, Set<string>>, key: string, id: string): void {
    const set = index.get(key);
    if (!set) return;
    set.delete(id);
    if (set.size === 0) index.delete(key);
  }

  private getFromIndex(index: Map<string, Set<string>>, key: string): TraceLink[] {
    const ids = index.get(key);
    if (!ids) return [];
    return Array.from(ids).map(id => this.links.get(id)).filter(Boolean) as TraceLink[];
  }
}

export function createTraceRegistry(): TraceRegistry {
  return new TraceRegistry();
}
