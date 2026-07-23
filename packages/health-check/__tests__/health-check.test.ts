import { HealthCheckAggregator } from '../src/aggregator';
import { SystemChecker, ProcessChecker } from '../src/system';
import { HealthChecker, ComponentHealth } from '../src/types';

describe('HealthCheckAggregator', () => {
  let aggregator: HealthCheckAggregator;

  beforeEach(() => {
    aggregator = new HealthCheckAggregator();
  });

  it('should register and list checkers', () => {
    const registered = aggregator.getRegistered();
    expect(registered).toContain('system');
    expect(registered).toContain('process');
  });

  it('should return healthy status when all checks pass', async () => {
    const result = await aggregator.check();
    expect(result.status).toBe('healthy');
    expect(result.checks.length).toBeGreaterThanOrEqual(2);
    expect(result.timestamp).toBeTruthy();
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should include system check with metadata', async () => {
    const result = await aggregator.check();
    const systemCheck = result.checks.find(c => c.name === 'system');
    expect(systemCheck).toBeDefined();
    expect(systemCheck!.metadata).toBeDefined();
    expect(systemCheck!.metadata).toHaveProperty('memory');
    expect(systemCheck!.metadata).toHaveProperty('cpu');
  });

  it('should register custom checker', () => {
    const custom: HealthChecker = {
      name: 'custom',
      async check() {
        return { name: 'custom', status: 'healthy' };
      },
    };
    aggregator.register(custom);
    expect(aggregator.getRegistered()).toContain('custom');
  });

  it('should handle checker errors gracefully', async () => {
    const failing: HealthChecker = {
      name: 'failing',
      async check() { throw new Error('Test failure'); },
    };
    aggregator.register(failing);
    const result = await aggregator.check();
    const failCheck = result.checks.find(c => c.name === 'failing');
    expect(failCheck).toBeDefined();
    expect(failCheck!.status).toBe('unhealthy');
    expect(failCheck!.message).toContain('Test failure');
  });

  it('should report unhealthy when a checker fails', async () => {
    const failing: HealthChecker = {
      name: 'failing',
      async check() { throw new Error('Critical failure'); },
    };
    aggregator.register(failing);
    const result = await aggregator.check();
    expect(result.status).toBe('unhealthy');
  });

  it('should support version option', () => {
    const withVersion = new HealthCheckAggregator({ version: '1.0.0' });
    expect(withVersion).toBeDefined();
  });

  it('should unregister a checker', () => {
    aggregator.unregister('process');
    expect(aggregator.getRegistered()).not.toContain('process');
  });

  it('should include latency in component checks', async () => {
    const result = await aggregator.check();
    for (const check of result.checks) {
      expect(check.latency).toBeDefined();
      expect(check.latency!).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('SystemChecker', () => {
  it('should report system metrics', async () => {
    const checker = new SystemChecker();
    const result = await checker.check();
    expect(result.name).toBe('system');
    expect(['healthy', 'degraded']).toContain(result.status);
    expect(result.metadata).toHaveProperty('memory');
    expect(result.metadata).toHaveProperty('cpu');
    expect(result.metadata!.cpu).toHaveProperty('loadAvg');
  });
});

describe('ProcessChecker', () => {
  it('should report process info', async () => {
    const checker = new ProcessChecker();
    const result = await checker.check();
    expect(result.name).toBe('process');
    expect(result.status).toBe('healthy');
    expect(result.metadata).toHaveProperty('pid');
    expect(result.metadata).toHaveProperty('uptime');
  });
});
