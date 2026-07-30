import type { MetadataEntry, GraphNode, GraphEdge } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('graph-builder');

export class GraphBuilder {
  build(entries: MetadataEntry[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodeMap = new Map<string, GraphNode>();
    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    for (const entry of entries) {
      nodeMap.set(entry.path, {
        id: entry.path,
        label: entry.title ?? entry.path,
        type: 'file',
        metadata: { ...entry },
      });

      for (const tag of entry.tags) {
        const tagId = `tag:${tag.toLowerCase()}`;
        if (!nodeMap.has(tagId)) {
          nodeMap.set(tagId, { id: tagId, label: tag, type: 'tag', metadata: {} });
        }
        const edgeKey = `${entry.path}|${tagId}|tag`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({ source: entry.path, target: tagId, type: 'tag', weight: 1 });
        }
      }

      for (const link of entry.links) {
        const edgeKey = `${entry.path}|${link}|link`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({ source: entry.path, target: link, type: 'link', weight: 1 });
        }
      }

      for (const bl of entry.backlinks) {
        const edgeKey = `${bl}|${entry.path}|backlink`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({ source: bl, target: entry.path, type: 'backlink', weight: 1 });
        }
      }
    }

    return { nodes: [...nodeMap.values()], edges };
  }

  getConnected(
    path: string,
    depth = 1,
    entries: MetadataEntry[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const entryMap = new Map<string, MetadataEntry>();
    for (const e of entries) entryMap.set(e.path, e);

    const visited = new Set<string>();
    const queue: { p: string; d: number }[] = [{ p: path, d: 0 }];
    const connectedEdges: GraphEdge[] = [];
    const connectedNodes = new Map<string, GraphNode>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      if (visited.has(current.p)) continue;
      visited.add(current.p);

      const entry = entryMap.get(current.p);
      if (entry) {
        connectedNodes.set(current.p, {
          id: current.p,
          label: entry.title ?? current.p,
          type: 'file',
          metadata: { ...entry },
        });

        if (current.d < depth) {
          for (const link of entry.links) {
            connectedEdges.push({ source: current.p, target: link, type: 'link', weight: 1 });
            if (!visited.has(link)) queue.push({ p: link, d: current.d + 1 });
          }
          for (const bl of entry.backlinks) {
            connectedEdges.push({ source: bl, target: current.p, type: 'backlink', weight: 1 });
            if (!visited.has(bl)) queue.push({ p: bl, d: current.d + 1 });
          }
        }
      }
    }

    return { nodes: [...connectedNodes.values()], edges: connectedEdges };
  }

  getTagGraph(
    tag: string,
    entries: MetadataEntry[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const tagId = `tag:${tag.toLowerCase()}`;
    const tagNode: GraphNode = { id: tagId, label: tag, type: 'tag', metadata: {} };
    const nodes = new Map<string, GraphNode>([[tagId, tagNode]]);
    const edges: GraphEdge[] = [];

    for (const entry of entries) {
      const hasTag = entry.tags.some(t => t.toLowerCase() === tag.toLowerCase());
      if (!hasTag) continue;

      nodes.set(entry.path, {
        id: entry.path,
        label: entry.title ?? entry.path,
        type: 'file',
        metadata: { ...entry },
      });

      edges.push({ source: entry.path, target: tagId, type: 'tag', weight: 1 });
    }

    return { nodes: [...nodes.values()], edges };
  }
}
