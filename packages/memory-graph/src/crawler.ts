import { MemoryGraph } from './graph';
import { createLogger } from '@ideia/logger';
import { GraphNode } from './types';

export class GraphCrawler {
  private graph: MemoryGraph;

  constructor(graph: MemoryGraph) {
    this.graph = graph;
  }

  crawlMemoryStore(): GraphNode[] {
    return [
      {
        id: 'mem-1', type: 'memory', label: 'Session context from earlier chat',
        properties: { source: 'mem0', tokens: 2048 }, tags: ['session', 'context'], timestamp: Date.now(),
      },
      {
        id: 'mem-2', type: 'memory', label: 'User preference: dark mode',
        properties: { source: 'mem0', category: 'preference' }, tags: ['user', 'ui'], timestamp: Date.now(),
      },
    ];
  }

  crawlPatternLearner(): GraphNode[] {
    return [
      {
        id: 'pat-1', type: 'pattern', label: 'Repeated error on login route',
        properties: { pattern: 'auth/timeout', occurrences: 12 }, tags: ['error', 'auth'], timestamp: Date.now(),
      },
    ];
  }

  crawlKnowledgeBase(): GraphNode[] {
    return [
      {
        id: 'kb-1', type: 'artifact', label: 'Architecture Overview',
        properties: { format: 'markdown', path: 'docs/arch.md' }, tags: ['docs', 'architecture'], timestamp: Date.now(),
      },
      {
        id: 'kb-2', type: 'artifact', label: 'API Contract v2',
        properties: { format: 'openapi', version: '2.0' }, tags: ['api', 'contract'], timestamp: Date.now(),
      },
    ];
  }

  crawlTraceRegistry(): GraphNode[] {
    return [
      {
        id: 'trace-1', type: 'decision', label: 'Chose NATS over RabbitMQ',
        properties: { reason: 'performance reqs', outcome: 'success' }, tags: ['infra', 'decision'], timestamp: Date.now(),
      },
    ];
  }

  crawlAuditTrail(): GraphNode[] {
    return [
      {
        id: 'audit-1', type: 'error', label: 'Audit chain integrity violation',
        properties: { severity: 'critical', action: 'alerted' }, tags: ['security', 'audit'], timestamp: Date.now(),
      },
    ];
  }

  crawlAll(): void {
    const sources = [
      this.crawlMemoryStore(),
      this.crawlPatternLearner(),
      this.crawlKnowledgeBase(),
      this.crawlTraceRegistry(),
      this.crawlAuditTrail(),
    ];

    for (const nodes of sources) {
      for (const node of nodes) {
        this.graph.addNode({
          type: node.type,
          label: node.label,
          properties: node.properties,
          tags: node.tags,
        });
      }
    }
  }
}
