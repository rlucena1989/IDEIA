import { TraceRegistry } from './trace-registry';
import { createLogger } from '@ideia/logger';
import type { TraceLink } from './types';
import type { ObservabilityEngine } from '@ideia/observability-engine';
import type { EventBus } from '@ideia/event-bus';
const logger = createLogger('trace-registry:observability-integration');

export interface TraceObservabilityConfig {
  durationThresholdMs?: number;
  alertOnHighFailureRate?: boolean;
  failureRateThreshold?: number;
}

const DEFAULT_CONFIG: TraceObservabilityConfig = {
  durationThresholdMs: 30000,
  alertOnHighFailureRate: true,
  failureRateThreshold: 0.2,
};

export function setupTraceObservability(
  traceRegistry: TraceRegistry,
  observabilityEngine: ObservabilityEngine,
  deps?: {
    eventBus?: EventBus;
  },
  config: TraceObservabilityConfig = DEFAULT_CONFIG,
): { recordMetrics: () => void; getTraceMetrics: () => TraceMetrics } {
  const log = (msg: string) => logger.info('[TraceObservability] ${msg}');

  const cfg = { ...DEFAULT_CONFIG, ...config };

  function recordMetrics(): void {
    try {
      const allLinks = traceRegistry.getAll();

      const byRelationship: Record<string, number> = {};
      const bySourceType: Record<string, number> = {};
      const byTargetType: Record<string, number> = {};

      for (const link of allLinks) {
        byRelationship[link.relationship] = (byRelationship[link.relationship] ?? 0) + 1;
        bySourceType[link.sourceType] = (bySourceType[link.sourceType] ?? 0) + 1;
        byTargetType[link.targetType] = (byTargetType[link.targetType] ?? 0) + 1;
      }

      observabilityEngine.recordMetric('trace.total_links', allLinks.length, {});
      observabilityEngine.recordMetric('trace.avg_confidence', allLinks.length > 0
        ? allLinks.reduce((s, l) => s + l.confidence, 0) / allLinks.length
        : 0, {});

      for (const [rel, count] of Object.entries(byRelationship)) {
        observabilityEngine.recordMetric(`trace.relationship.${rel}`, count, { relationship: rel });
      }

      for (const [type, count] of Object.entries(bySourceType)) {
        observabilityEngine.recordMetric(`trace.source.${type}`, count, { entityType: type });
      }

      log(`Recorded metrics: ${allLinks.length} links, ${Object.keys(byRelationship).length} relationship types`);

      const graph = traceRegistry.getGraph();
      const nodeCount = graph.nodes.length;
      const edgeCount = graph.edges.length;

      if (nodeCount > 0) {
        observabilityEngine.recordMetric('trace.graph_nodes', nodeCount, {});
      }
      if (edgeCount > 0) {
        observabilityEngine.recordMetric('trace.graph_edges', edgeCount, {});
      }

      if (cfg.alertOnHighFailureRate && allLinks.length > 0) {
        const blockedLinks = allLinks.filter(l => l.relationship === 'blocks');
        const failureRate = blockedLinks.length / allLinks.length;
        if (failureRate > (cfg.failureRateThreshold ?? 0.2)) {
          log(`WARN: High failure/block rate: ${(failureRate * 100).toFixed(1)}%`);
          observabilityEngine.recordMetric('trace.alert.high_block_rate', failureRate, { alert: 'high_block_rate' });
        }
      }
    } catch (err) {
      logger.error('Error recording metrics', { error: String(err) });
    }
  }

  if (deps?.eventBus) {
    deps.eventBus.subscribe('trace.linked', async () => {
      recordMetrics();
    });
  }

  const getTraceMetrics = () => {
    const allLinks = traceRegistry.getAll();
    const graph = traceRegistry.getGraph();

    return {
      totalLinks: allLinks.length,
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      confidenceDistribution: {
        min: allLinks.length > 0 ? Math.min(...allLinks.map(l => l.confidence)) : 0,
        max: allLinks.length > 0 ? Math.max(...allLinks.map(l => l.confidence)) : 0,
        avg: allLinks.length > 0
          ? allLinks.reduce((s, l) => s + l.confidence, 0) / allLinks.length
          : 0,
      },
      byRelationship: allLinks.reduce<Record<string, number>>((acc, l) => {
        acc[l.relationship] = (acc[l.relationship] ?? 0) + 1;
        return acc;
      }, {}),
    };
  };

  log('Trace observability setup complete');
  recordMetrics();

  return { recordMetrics, getTraceMetrics };
}

export interface TraceMetrics {
  totalLinks: number;
  totalNodes: number;
  totalEdges: number;
  confidenceDistribution: {
    min: number;
    max: number;
    avg: number;
  };
  byRelationship: Record<string, number>;
}
