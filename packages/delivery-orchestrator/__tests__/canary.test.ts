import { describe, it, expect } from '@jest/globals';
import { CanaryDeployer, createCanaryDeployer, CanaryConfig } from '../src/canary';

describe('CanaryDeployer', () => {
  it('should create with default config', () => {
    const d = createCanaryDeployer();
    const config = d.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.steps).toEqual(['verify', '10_percent', '50_percent', '100_percent']);
    expect(config.cooldownMs).toBe(60000);
  });

  it('should allow config override', () => {
    const d = createCanaryDeployer({ enabled: false, cooldownMs: 10000 });
    const config = d.getConfig();
    expect(config.enabled).toBe(false);
    expect(config.cooldownMs).toBe(10000);
  });

  it('should start canary for non-production and immediately promote', async () => {
    const d = createCanaryDeployer();
    const state = await d.startCanary('1.0.0', 'development');
    expect(state.status).toBe('promoted');
    expect(state.currentStep).toBe('100_percent');
  });

  it('should start canary for production', async () => {
    const d = createCanaryDeployer({ cooldownMs: 1 });
    const state = await d.startCanary('1.0.0', 'production');
    expect(state.status).toBe('running');
    expect(state.deployId).toBeDefined();
  });

  it('should promote canary manually', async () => {
    const d = createCanaryDeployer();
    const state = await d.startCanary('1.0.0', 'production');
    const promoted = d.promote(state.deployId);
    expect(promoted).toBe(true);
    const updated = d.getState(state.deployId);
    expect(updated?.status).toBe('promoted');
  });

  it('should rollback canary manually', async () => {
    const d = createCanaryDeployer();
    const state = await d.startCanary('1.0.0', 'production');
    const rolled = d.rollback(state.deployId);
    expect(rolled).toBe(true);
    const updated = d.getState(state.deployId);
    expect(updated?.status).toBe('rolled_back');
  });

  it('should skip canary if disabled', async () => {
    const d = createCanaryDeployer({ enabled: false });
    const state = await d.startCanary('1.0.0', 'production');
    expect(state.status).toBe('promoted');
  });

  it('should list active canaries', async () => {
    const d = createCanaryDeployer();
    await d.startCanary('1.0.0', 'production');
    const active = d.listActive();
    expect(active.length).toBeGreaterThanOrEqual(1);
    expect(active[0].status).toBe('running');
  });

  it('should promote unknown deploy returns false', () => {
    const d = createCanaryDeployer();
    expect(d.promote('unknown')).toBe(false);
  });
});
