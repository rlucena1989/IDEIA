import { SelfHealer } from './self-healing';
import { DEFAULT_SELF_HEALING_CONFIG, SelfHealingConfig } from './types';

jest.mock('child_process', () => ({
  execSync: jest.fn(() => ''),
}));

describe('SelfHealer', () => {
  let healer: SelfHealer;
  let config: SelfHealingConfig;
  let mockDate: jest.SpyInstance;
  const baseTime = 1000000;

  beforeEach(() => {
    mockDate = jest.spyOn(Date, 'now').mockReturnValue(baseTime);
    config = { ...DEFAULT_SELF_HEALING_CONFIG, enabled: true, actions: ['clear_cache', 'kill_process', 'reconnect', 'restart'] };
    healer = new SelfHealer(config);
  });

  afterEach(() => {
    mockDate.mockRestore();
  });

  it('returns disabled when self-healing is disabled', async () => {
    healer.updateConfig({ ...config, enabled: false });
    const result = await healer.executeAction('clear_cache', 'test');
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Self-healing disabled');
  });

  it('rejects action not in allowed list', async () => {
    healer.updateConfig({ ...config, actions: ['reconnect'] });
    const result = await healer.executeAction('kill_process', 'test');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not in allowed list');
  });

  it('enforces cooldown on repeated actions', async () => {
    const result1 = await healer.executeAction('clear_cache', 'cache-svc');
    expect(result1.ok).toBe(true);

    const result2 = await healer.executeAction('clear_cache', 'cache-svc');
    expect(result2.ok).toBe(false);
    expect(result2.message).toContain('Cooldown active');
  });

  it('allows action after cooldown expires', async () => {
    await healer.executeAction('clear_cache', 'cache-svc');
    mockDate.mockReturnValue(baseTime + config.cooldownMs + 1);
    const result = await healer.executeAction('clear_cache', 'cache-svc');
    expect(result.ok).toBe(true);
  });

  it('clearCache returns message about gc availability without --expose-gc', async () => {
    const result = await healer.executeAction('clear_cache', 'resource-manager');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('GC not available');
  });

  it('killProcess refuses to kill own process', async () => {
    const result = await healer.executeAction('kill_process', 'self', process.pid);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Refusing to kill self');
  });

  it('reconnect with nats target returns success message', async () => {
    const result = await healer.executeAction('reconnect', 'nats-bus');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('NATS reconnection');
  });

  it('reconnect with llm provider returns queued message', async () => {
    const result = await healer.executeAction('reconnect', 'llm-provider');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('LLM provider reconnection queued');
  });

  it('restartService enforces rate limit', async () => {
    const rateLimitHealer = new SelfHealer({ ...config, cooldownMs: 0 });
    const first = await rateLimitHealer.executeAction('restart', 'my-service');
    expect(first.ok).toBe(true);
    expect(first.message).toContain('Restart signal sent');
    mockDate.mockReturnValue(baseTime + 500);
    const second = await rateLimitHealer.executeAction('restart', 'my-service');
    expect(second.ok).toBe(true);
    expect(second.message).toContain('Restart signal sent');
    mockDate.mockReturnValue(baseTime + 1000);
    const third = await rateLimitHealer.executeAction('restart', 'my-service');
    expect(third.ok).toBe(false);
    expect(third.message).toContain('Restart rate limit');
  });

  it('restartService allows restart for different targets independently', async () => {
    await healer.executeAction('restart', 'service-a');
    const result = await healer.executeAction('restart', 'service-b');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('Restart signal sent');
  });

  it('getRestartCount returns total restart count', async () => {
    expect(healer.getRestartCount()).toBe(0);
    await healer.executeAction('restart', 'svc1');
    await healer.executeAction('restart', 'svc2');
    expect(healer.getRestartCount()).toBe(2);
  });
});
