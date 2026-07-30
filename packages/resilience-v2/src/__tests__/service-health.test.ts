import {
  ServiceHealthCheck, ServiceHealthResult,
  NatsHealthCheck, LlmHealthCheck, FileSystemHealthCheck,
  SearchHealthCheck, GitHealthCheck,
  HealthCheckRegistry,
  createCoreServiceHealthChecks,
} from '../service-health';

let mockCounter = 0;
class MockHealthCheck extends ServiceHealthCheck {
  readonly name: string;
  private shouldSucceed: boolean;
  constructor(succeed = true, name?: string) { super(); this.shouldSucceed = succeed; this.name = name || `mock-${++mockCounter}`; }
  async performCheck(): Promise<ServiceHealthResult> {
    if (!this.shouldSucceed) throw new Error('mock failure');
    return { name: this.name, status: 'healthy', latency: 0, lastChecked: new Date() };
  }
}

describe('ServiceHealthCheck base class', () => {
  it('should return result from check()', async () => {
    const hc = new MockHealthCheck(true, 'test-svc');
    const result = await hc.check();
    expect(result.name).toBe('test-svc');
    expect(result.status).toBe('healthy');
    expect(result.lastChecked).toBeInstanceOf(Date);
  });

  it('should return failure result when check throws', async () => {
    const hc = new MockHealthCheck(false, 'test-fail');
    const result = await hc.check();
    expect(result.status).toBe('unhealthy');
    expect(result.error).toContain('mock failure');
  });

  it('should store last status', async () => {
    const hc = new MockHealthCheck(true, 'test-status');
    expect(hc.getLastStatus()).toBeNull();
    await hc.check();
    expect(hc.getLastStatus()).not.toBeNull();
    expect(hc.getLastStatus()!.name).toBe('test-status');
  });

  it('should return uptime', async () => {
    const hc = new MockHealthCheck(true, 'test-uptime');
    await new Promise(r => setTimeout(r, 10));
    expect(hc.getUptime()).toBeGreaterThan(0);
  });
});

describe('NatsHealthCheck', () => {
  it('should have name nats', () => {
    const hc = new NatsHealthCheck();
    expect(hc.name).toBe('nats');
  });

  it('should return result with name and lastChecked', async () => {
    const hc = new NatsHealthCheck({ url: 'nats://nonexistent:9999' });
    const result = await hc.check();
    expect(result.name).toBe('nats');
    expect(result.lastChecked).toBeInstanceOf(Date);
  });
});

describe('LlmHealthCheck', () => {
  it('should have name llm', () => {
    const hc = new LlmHealthCheck();
    expect(hc.name).toBe('llm');
  });

  it('should return unhealthy when endpoint unreachable', async () => {
    const hc = new LlmHealthCheck({ endpoint: 'http://nonexistent:9999' });
    const result = await hc.check();
    expect(result.status).toBe('unhealthy');
  });
});

describe('FileSystemHealthCheck', () => {
  it('should have name filesystem', () => {
    const hc = new FileSystemHealthCheck();
    expect(hc.name).toBe('filesystem');
  });

  it('should return healthy for existing writable paths', async () => {
    const hc = new FileSystemHealthCheck(['.']);
    const result = await hc.check();
    expect(result.status).toBe('healthy');
  });

  it('should return degraded for nonexistent paths', async () => {
    const hc = new FileSystemHealthCheck(['nonexistent-dir-xyz']);
    const result = await hc.check();
    expect(result.status).toBe('degraded');
  });
});

describe('SearchHealthCheck', () => {
  it('should have name search', () => {
    const hc = new SearchHealthCheck();
    expect(hc.name).toBe('search');
  });

  it('should return result with status', async () => {
    const hc = new SearchHealthCheck();
    const result = await hc.check();
    expect(['healthy', 'degraded']).toContain(result.status);
  });
});

describe('GitHealthCheck', () => {
  it('should have name git', () => {
    const hc = new GitHealthCheck();
    expect(hc.name).toBe('git');
  });

  it('should return result with git version', async () => {
    const hc = new GitHealthCheck();
    const result = await hc.check();
    expect(result.status).toBe('healthy');
    expect(result.metadata?.version).toContain('git');
  });
});

describe('HealthCheckRegistry', () => {
  it('should register and run checks', async () => {
    const registry = new HealthCheckRegistry();
    registry.register(new MockHealthCheck(true, 'svc-a'));
    registry.register(new MockHealthCheck(true, 'svc-b'));
    const results = await registry.runAll();
    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === 'healthy')).toBe(true);
  });

  it('should unregister checks', async () => {
    const registry = new HealthCheckRegistry();
    registry.register(new MockHealthCheck(true, 'svc-a'));
    registry.register(new MockHealthCheck(true, 'svc-b'));
    registry.unregister('svc-a');
    const results = await registry.runAll();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('svc-b');
  });

  it('should get results map', async () => {
    const registry = new HealthCheckRegistry();
    const hc = new MockHealthCheck(true, 'svc-x');
    registry.register(hc);
    await registry.runAll();
    const results = registry.getResults();
    expect(results.has('svc-x')).toBe(true);
    expect(results.get('svc-x')!.status).toBe('healthy');
  });

  it('should compute summary', async () => {
    const registry = new HealthCheckRegistry();
    registry.register(new MockHealthCheck(true, 'svc-a'));
    registry.register(new MockHealthCheck(true, 'svc-b'));
    await registry.runAll();
    const summary = registry.getSummary();
    expect(summary.total).toBe(2);
    expect(summary.healthy).toBe(2);
    expect(summary.unhealthy).toBe(0);
  });

  it('should compute partial summary', async () => {
    const registry = new HealthCheckRegistry();
    registry.register(new MockHealthCheck(true, 'svc-a'));
    registry.register(new MockHealthCheck(false, 'svc-b'));
    await registry.runAll();
    const summary = registry.getSummary();
    expect(summary.total).toBe(2);
    expect(summary.unhealthy).toBe(1);
  });
});

describe('createCoreServiceHealthChecks', () => {
  it('should return all 5 core checks', () => {
    const checks = createCoreServiceHealthChecks();
    expect(checks).toHaveLength(5);
    const names = checks.map(c => c.name);
    expect(names).toContain('nats');
    expect(names).toContain('llm');
    expect(names).toContain('filesystem');
    expect(names).toContain('search');
    expect(names).toContain('git');
  });
});
