import { describe, it, expect, beforeEach } from '@jest/globals';
import { ObservabilityEngine, createObservabilityEngine } from '../src/engine';
import { NatsMetrics } from '../src/types';

describe('ObservabilityEngine', () => {
  let engine: ObservabilityEngine;

  beforeEach(() => {
    engine = new ObservabilityEngine();
  });

  describe('constructor', () => {
    it('should create engine with default components', () => {
      expect(engine).toBeInstanceOf(ObservabilityEngine);
    });
  });

  describe('collectMetrics', () => {
    it('should collect NATS metrics', () => {
      const metrics = engine.collectMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.streams).toBeDefined();
      expect(metrics.consumers).toBeDefined();
      expect(metrics.health).toBeDefined();
    });
  });

  describe('checkSLOs', () => {
    it('should check SLOs against metrics', () => {
      const metrics: NatsMetrics = {
        streams: { count: 10, totalMessages: 1000, totalBytes: 100000, streamsWithDiscards: 0, averageMessagesPerStream: 100 },
        consumers: { count: 5, withLag: 1, totalPending: 50, avgAckPending: 10, redeliveryRate: 0.01 },
        dlq: { size: 0, oldestMessageAge: 0, growthRate: 0, dlqRate: 0 },
        latency: { p50: 10, p90: 20, p95: 30, p99: 50, p999: 100 },
        throughput: { messagesPerSecond: 100, bytesPerSecond: 10000 },
        health: { healthy: true, connected: true, reconnects: 0, lastError: null, uptime: 3600 },
      };
      const sloStatus = engine.checkSLOs(metrics);
      expect(sloStatus).toBeDefined();
      expect(Array.isArray(sloStatus)).toBe(true);
    });
  });

  describe('getAlerts', () => {
    it('should return alerts', () => {
      const alerts = engine.getAlerts();
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('evaluateAlerts', () => {
    it('should evaluate alert rules against metrics', () => {
      const metrics: NatsMetrics = {
        streams: { count: 10, totalMessages: 1000, totalBytes: 100000, streamsWithDiscards: 0, averageMessagesPerStream: 100 },
        consumers: { count: 5, withLag: 1, totalPending: 50, avgAckPending: 10, redeliveryRate: 0.01 },
        dlq: { size: 0, oldestMessageAge: 0, growthRate: 0, dlqRate: 0 },
        latency: { p50: 10, p90: 20, p95: 30, p99: 50, p999: 100 },
        throughput: { messagesPerSecond: 100, bytesPerSecond: 10000 },
        health: { healthy: true, connected: true, reconnects: 0, lastError: null, uptime: 3600 },
      };
      const alerts = engine.evaluateAlerts(metrics);
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('exportPrometheus', () => {
    it('should export metrics in Prometheus format', () => {
      const metrics: NatsMetrics = {
        streams: { count: 10, totalMessages: 1000, totalBytes: 100000, streamsWithDiscards: 0, averageMessagesPerStream: 100 },
        consumers: { count: 5, withLag: 1, totalPending: 50, avgAckPending: 10, redeliveryRate: 0.01 },
        dlq: { size: 0, oldestMessageAge: 0, growthRate: 0, dlqRate: 0 },
        latency: { p50: 10, p90: 20, p95: 30, p99: 50, p999: 100 },
        throughput: { messagesPerSecond: 100, bytesPerSecond: 10000 },
        health: { healthy: true, connected: true, reconnects: 0, lastError: null, uptime: 3600 },
      };
      const prometheus = engine.exportPrometheus(metrics);
      expect(prometheus).toBeDefined();
      expect(typeof prometheus).toBe('string');
    });
  });

  describe('createObservabilityEngine', () => {
    it('should create engine instance', () => {
      const engine = createObservabilityEngine();
      expect(engine).toBeInstanceOf(ObservabilityEngine);
    });
  });
});
