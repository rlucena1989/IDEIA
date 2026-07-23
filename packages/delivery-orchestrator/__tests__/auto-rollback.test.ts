import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DeliveryOrchestrator, createDeliveryOrchestrator } from '../src/delivery-orchestrator';
import { AutoRollbackMonitor, createAutoRollbackMonitor, HealthCheckConfig } from '../src/auto-rollback';
import { WebhookManager, createWebhookManager } from '../src/webhook';

describe('AutoRollbackMonitor', () => {
  let orchestrator: DeliveryOrchestrator;
  let webhookManager: WebhookManager;
  let monitor: AutoRollbackMonitor;

  beforeEach(() => {
    orchestrator = createDeliveryOrchestrator();
    webhookManager = createWebhookManager();
    monitor = createAutoRollbackMonitor(orchestrator, { webhookManager });
  });

  afterEach(() => {
    const active = monitor.listActive();
    for (const state of active) {
      monitor.stopMonitoring(state.deployId);
    }
  });

  it('should start monitoring a deploy', () => {
    const state = monitor.startMonitoring('deploy-1', '1.0.0');
    expect(state.enabled).toBe(true);
    expect(state.status).toBe('monitoring');
    expect(state.deployId).toBe('deploy-1');
    expect(state.failureCount).toBe(0);
  });

  it('should stop monitoring a deploy', () => {
    monitor.startMonitoring('deploy-1', '1.0.0');
    const result = monitor.stopMonitoring('deploy-1');
    expect(result).toBe(true);
  });

  it('should return false stopping unknown deploy', () => {
    const result = monitor.stopMonitoring('unknown');
    expect(result).toBe(false);
  });

  it('should return null for non-monitored deploy', () => {
    const state = monitor.getState('unknown');
    expect(state).toBeUndefined();
  });

  it('should list active monitors', () => {
    monitor.startMonitoring('deploy-1', '1.0.0');
    monitor.startMonitoring('deploy-2', '1.0.0');
    const active = monitor.listActive();
    expect(active).toHaveLength(2);
  });

  it('should stop listing after removal', () => {
    monitor.startMonitoring('deploy-1', '1.0.0');
    monitor.stopMonitoring('deploy-1');
    const active = monitor.listActive();
    expect(active).toHaveLength(0);
  });

  it('should accept custom health check config', () => {
    const healthConfig: Partial<HealthCheckConfig> = {
      endpoint: 'http://localhost:8080/health',
      intervalMs: 10000,
      maxRetries: 5,
    };

    const state = monitor.startMonitoring('deploy-1', '1.0.0', undefined, healthConfig);
    expect(state.healthCheckConfig.endpoint).toBe('http://localhost:8080/health');
    expect(state.healthCheckConfig.intervalMs).toBe(10000);
    expect(state.healthCheckConfig.maxRetries).toBe(5);
  });
});
