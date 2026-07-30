import { createLogger } from '@ideia/logger';

const logger = createLogger('data-layer:lineage');

export interface LineageEvent {
  id: string;
  dataId: string;
  sourceComponent: string;
  sourceDataId?: string;
  operation: 'create' | 'transform' | 'merge' | 'copy' | 'delete' | 'import';
  targetComponent?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface LineageNode {
  dataId: string;
  component: string;
  createdAt: string;
  lastModifiedAt: string;
  events: LineageEvent[];
}

export interface LineageEdge {
  from: string;
  to: string;
  operation: LineageEvent['operation'];
  component: string;
  timestamp: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface LineageQuery {
  dataId?: string;
  sourceComponent?: string;
  operation?: LineageEvent['operation'];
  since?: string;
  until?: string;
  limit?: number;
}

export class DataLineageTracker {
  private events: LineageEvent[] = [];
  protected maxEvents: number;

  constructor(maxEvents = 10000) {
    this.maxEvents = maxEvents;
  }

  record(event: Omit<LineageEvent, 'id' | 'timestamp'>): LineageEvent {
    const record: LineageEvent = {
      id: crypto.randomUUID(),
      ...event,
      timestamp: new Date().toISOString(),
    };
    this.events.push(record);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    logger.debug('Lineage event recorded', { dataId: event.dataId, operation: event.operation });
    return record;
  }

  recordCreate(dataId: string, component: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceComponent: component, operation: 'create', metadata });
  }

  recordTransform(dataId: string, sourceDataId: string, component: string, targetComponent?: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceDataId, sourceComponent: component, operation: 'transform', targetComponent, metadata });
  }

  recordMerge(dataId: string, sourceDataId: string, component: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceDataId, sourceComponent: component, operation: 'merge', metadata });
  }

  recordCopy(dataId: string, sourceDataId: string, component: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceDataId, sourceComponent: component, operation: 'copy', metadata });
  }

  recordDelete(dataId: string, component: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceComponent: component, operation: 'delete', metadata });
  }

  recordImport(dataId: string, sourceComponent: string, sourceDataId?: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceComponent, sourceDataId, operation: 'import', metadata });
  }

  query(query: LineageQuery): LineageEvent[] {
    let results = [...this.events];

    if (query.dataId) {
      results = results.filter(e => e.dataId === query.dataId || e.sourceDataId === query.dataId);
    }
    if (query.sourceComponent) {
      results = results.filter(e => e.sourceComponent === query.sourceComponent);
    }
    if (query.operation) {
      results = results.filter(e => e.operation === query.operation);
    }
    if (query.since) {
      const since = query.since;
      results = results.filter(e => e.timestamp >= since);
    }
    if (query.until) {
      const until = query.until;
      results = results.filter(e => e.timestamp <= until);
    }

    results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (query.limit && results.length > query.limit) {
      results = results.slice(-query.limit);
    }
    return results;
  }

  getLineage(dataId: string): LineageEvent[] {
    const visited = new Set<string>();
    const lineage: LineageEvent[] = [];
    const queue = [dataId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) continue;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const related = this.events.filter(
        e => e.dataId === currentId || e.sourceDataId === currentId
      );
      for (const event of related) {
        lineage.push(event);
        if (event.sourceDataId && !visited.has(event.sourceDataId)) {
          queue.push(event.sourceDataId);
        }
      }
    }

    return lineage.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  getLineageGraph(dataId: string): LineageGraph {
    const lineage = this.getLineage(dataId);
    const nodeMap = new Map<string, LineageNode>();
    const edges: LineageEdge[] = [];

    for (const event of lineage) {
      if (!nodeMap.has(event.dataId)) {
        nodeMap.set(event.dataId, {
          dataId: event.dataId,
          component: event.sourceComponent,
          createdAt: event.timestamp,
          lastModifiedAt: event.timestamp,
          events: [],
        });
      }
      const node = nodeMap.get(event.dataId);
      if (!node) continue;
      node.events.push(event);
      if (event.timestamp > node.lastModifiedAt) {
        node.lastModifiedAt = event.timestamp;
      }

      if (event.sourceDataId) {
        if (!nodeMap.has(event.sourceDataId)) {
          nodeMap.set(event.sourceDataId, {
            dataId: event.sourceDataId,
            component: event.sourceComponent,
            createdAt: event.timestamp,
            lastModifiedAt: event.timestamp,
            events: [],
          });
        }
        edges.push({
          from: event.sourceDataId,
          to: event.dataId,
          operation: event.operation,
          component: event.sourceComponent,
          timestamp: event.timestamp,
        });
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
    };
  }

  getOrigin(dataId: string): LineageEvent | null {
    const lineage = this.getLineage(dataId);
    const createEvents = lineage.filter(e => e.operation === 'create' || e.operation === 'import');
    if (createEvents.length === 0) return null;
    return createEvents.reduce((earliest, current) =>
      current.timestamp < earliest.timestamp ? current : earliest
    );
  }

  findDataProducedBy(component: string, options?: { since?: string; limit?: number }): LineageEvent[] {
    let results = this.events.filter(e => e.sourceComponent === component);
    if (options?.since) {
      results = results.filter(e => options.since ? e.timestamp >= options.since : true);
    }
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }

  getStats(): { totalEvents: number; uniqueDataIds: number; uniqueComponents: number } {
    const dataIds = new Set(this.events.map(e => e.dataId));
    const components = new Set(this.events.map(e => e.sourceComponent));
    return {
      totalEvents: this.events.length,
      uniqueDataIds: dataIds.size,
      uniqueComponents: components.size,
    };
  }

  clear(): void {
    this.events = [];
    logger.info('Lineage tracker cleared');
  }
}

export function createLineageTracker(maxEvents?: number): DataLineageTracker {
  return new DataLineageTracker(maxEvents);
}
