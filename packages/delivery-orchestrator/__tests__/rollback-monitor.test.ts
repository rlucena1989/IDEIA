import { RollbackMonitor } from '../src/rollback-monitor';

describe('RollbackMonitor', () => {
  let monitor: RollbackMonitor;
  let triggers: Array<{ deployId: string; ruleName: string }>;

  beforeEach(() => {
    triggers = [];
    monitor = new RollbackMonitor(
      async (deployId, trigger) => {
        triggers.push({ deployId, ruleName: trigger.ruleName });
      },
      { checkIntervalMs: 50000 },
    );
  });

  afterEach(() => {
    monitor.listActive().forEach(id => monitor.stopMonitoring(id));
  });

  it('should start and stop monitoring', () => {
    monitor.startMonitoring('deploy-1');
    expect(monitor.listActive()).toContain('deploy-1');

    monitor.stopMonitoring('deploy-1');
    expect(monitor.listActive()).not.toContain('deploy-1');
  });

  it('should trigger rollback on high error rate', async () => {
    monitor.startMonitoring('deploy-2');
    monitor.pushMetrics('deploy-2', { timestamp: new Date().toISOString(), errorRate: 0.25, latencyP99: 200, healthStatus: true, incidentCount: 0 });
    await monitor.checkNow('deploy-2');

    expect(triggers.length).toBeGreaterThanOrEqual(1);
    expect(triggers[0]!.ruleName).toBe('high_error_rate');
  });

  it('should trigger rollback on health check failure', async () => {
    monitor.startMonitoring('deploy-3');
    monitor.pushMetrics('deploy-3', { timestamp: new Date().toISOString(), errorRate: 0, latencyP99: 100, healthStatus: false, incidentCount: 0 });
    await monitor.checkNow('deploy-3');

    expect(triggers.length).toBeGreaterThanOrEqual(1);
    expect(triggers[0]!.ruleName).toBe('health_check_failure');
  });

  it('should trigger alert on incident spike', async () => {
    monitor.startMonitoring('deploy-4');
    monitor.pushMetrics('deploy-4', { timestamp: new Date().toISOString(), errorRate: 0, latencyP99: 100, healthStatus: true, incidentCount: 5 });
    await monitor.checkNow('deploy-4');

    expect(triggers.length).toBeGreaterThanOrEqual(1);
    expect(triggers[0]!.ruleName).toBe('incident_spike');
  });

  it('should store and retrieve history', () => {
    monitor.startMonitoring('deploy-5');
    monitor.pushMetrics('deploy-5', { timestamp: '2024-01-01T00:00:00Z', errorRate: 0, latencyP99: 100, healthStatus: true, incidentCount: 0 });
    monitor.pushMetrics('deploy-5', { timestamp: '2024-01-01T00:01:00Z', errorRate: 0.05, latencyP99: 200, healthStatus: true, incidentCount: 1 });

    const history = monitor.getHistory('deploy-5');
    expect(history).toHaveLength(2);
    expect(history[1]!.errorRate).toBe(0.05);
  });

  it('should respect cooldown between triggers', async () => {
    monitor.startMonitoring('deploy-6');
    monitor.pushMetrics('deploy-6', { timestamp: new Date().toISOString(), errorRate: 0.25, latencyP99: 200, healthStatus: true, incidentCount: 0 });
    await monitor.checkNow('deploy-6');
    const countAfterFirst = triggers.length;

    monitor.pushMetrics('deploy-6', { timestamp: new Date().toISOString(), errorRate: 0.3, latencyP99: 300, healthStatus: true, incidentCount: 0 });
    await monitor.checkNow('deploy-6');

    expect(triggers.length).toBe(countAfterFirst);
    monitor.stopMonitoring('deploy-6');
  });
});
