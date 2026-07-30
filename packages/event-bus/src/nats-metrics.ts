import type { IEventBus } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('nats-metrics');

export interface NatsMetricsCollector {
  eventsEmitted: number;
  eventsReceived: number;
  subscribeErrors: number;
  emitErrors: number;
  lastEmitLatencyMs: number;
  avgEmitLatencyMs: number;
  activeSubscriptions: number;
  startTime: string;
  getSummary(): NatsMetricsSummary;
}

export interface NatsMetricsSummary {
  eventsEmitted: number;
  eventsReceived: number;
  subscribeErrors: number;
  emitErrors: number;
  avgEmitLatencyMs: number;
  activeSubscriptions: number;
  uptimeMs: number;
}

export function createNatsMetricsCollector(eventBus: IEventBus): NatsMetricsCollector {
  let eventsEmitted = 0;
  let eventsReceived = 0;
  const subscribeErrors = 0;
  let emitErrors = 0;
  let lastEmitLatencyMs = 0;
  let totalEmitLatencyMs = 0;
  let emitCount = 0;
  const startTime = new Date().toISOString();

  void eventBus.subscribe('*', async () => {
    eventsReceived++;
  });

  const originalEmit = eventBus.emit.bind(eventBus);
  eventBus.emit = async (event) => {
    const start = Date.now();
    try {
      const result = await originalEmit(event);
      const latency = Date.now() - start;
      eventsEmitted++;
      lastEmitLatencyMs = latency;
      totalEmitLatencyMs += latency;
      emitCount++;
      return result;
    } catch (err) {
      emitErrors++;
      throw err;
    }
  };

  return {
    get eventsEmitted() { return eventsEmitted; },
    get eventsReceived() { return eventsReceived; },
    get subscribeErrors() { return subscribeErrors; },
    get emitErrors() { return emitErrors; },
    get lastEmitLatencyMs() { return lastEmitLatencyMs; },
    get avgEmitLatencyMs() { return emitCount > 0 ? totalEmitLatencyMs / emitCount : 0; },
    get activeSubscriptions() { return 0; },
    get startTime() { return startTime; },
    getSummary(): NatsMetricsSummary {
      return {
        eventsEmitted,
        eventsReceived,
        subscribeErrors,
        emitErrors,
        avgEmitLatencyMs: emitCount > 0 ? totalEmitLatencyMs / emitCount : 0,
        activeSubscriptions: 0,
        uptimeMs: Date.now() - new Date(startTime).getTime(),
      };
    },
  };
}
