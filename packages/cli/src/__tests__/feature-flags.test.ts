import { FeatureFlagManager, createFeatureFlags } from '../feature-flags';

describe('FeatureFlagManager', () => {
  let mgr: FeatureFlagManager;

  beforeEach(() => {
    mgr = new FeatureFlagManager();
  });

  it('should create via factory', () => {
    const f = createFeatureFlags();
    expect(f).toBeInstanceOf(FeatureFlagManager);
  });

  it('should have default flags', () => {
    const flags = mgr.list();
    expect(flags.length).toBeGreaterThan(10);
    expect(mgr.get('multi_agent')).toBeDefined();
    expect(mgr.get('nats_event_bus')).toBeDefined();
  });

  it('should get a specific flag', () => {
    const flag = mgr.get('guardrails');
    expect(flag).toBeDefined();
    expect(flag!.key).toBe('guardrails');
    expect(flag!.enabled).toBe(true);
  });

  it('should return undefined for unknown flag', () => {
    expect(mgr.get('unknown_flag')).toBeUndefined();
  });

  it('should register a new flag', () => {
    mgr.register({ key: 'new_flag', description: 'New feature', enabled: false, createdAt: '2026-07-22' });
    expect(mgr.get('new_flag')).toBeDefined();
    expect(mgr.get('new_flag')!.enabled).toBe(false);
  });

  it('should delete a flag', () => {
    expect(mgr.delete('mcp_protocol')).toBe(true);
    expect(mgr.get('mcp_protocol')).toBeUndefined();
    expect(mgr.delete('nonexistent')).toBe(false);
  });

  it('should evaluate globally enabled flag with no rules', () => {
    const r = mgr.isEnabled('llm_provider_router');
    expect(r.enabled).toBe(true);
    expect(r.reason).toBe('globally_enabled');
  });

  it('should evaluate globally disabled flag', () => {
    const r = mgr.isEnabled('nats_event_bus');
    expect(r.enabled).toBe(false);
  });

  it('should return disabled for unknown flag', () => {
    const r = mgr.isEnabled('nonexistent');
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('flag_not_found');
  });

  it('should respect override', () => {
    mgr.setOverride('nats_event_bus', true);
    const r = mgr.isEnabled('nats_event_bus');
    expect(r.enabled).toBe(true);
    expect(r.reason).toBe('override');
  });

  it('should clear a single override', () => {
    mgr.setOverride('guardrails', false);
    mgr.clearOverride('guardrails');
    const r = mgr.isEnabled('guardrails');
    expect(r.enabled).toBe(true);
  });

  it('should clear all overrides', () => {
    mgr.setOverride('guardrails', false);
    mgr.setOverride('llm_provider_router', false);
    mgr.clearAllOverrides();
    expect(mgr.isEnabled('guardrails').enabled).toBe(true);
    expect(mgr.isEnabled('llm_provider_router').enabled).toBe(true);
  });

  it('should evaluate target_all rule', () => {
    const r = mgr.isEnabled('guardrails');
    expect(r.enabled).toBe(true);
  });

  it('should accept initial flags in constructor', () => {
    const mgr2 = new FeatureFlagManager({ custom_flag: { key: 'custom_flag', description: 'Custom', enabled: true, createdAt: '2026-07-22' } });
    expect(mgr2.get('custom_flag')).toBeDefined();
    expect(mgr2.get('multi_agent')).toBeDefined();
  });

  it('should get list of enabled flags', () => {
    const enabled = mgr.getEnabledFlags();
    expect(enabled).toContain('guardrails');
    expect(enabled).not.toContain('nats_event_bus');
  });

  it('should return disabled when no rules match', () => {
    const r = mgr.isEnabled('semantic_search', { userId: 'unknown' });
    expect(r.enabled).toBe(false);
    expect(r.reason).toBe('no_rules_match');
  });
});
