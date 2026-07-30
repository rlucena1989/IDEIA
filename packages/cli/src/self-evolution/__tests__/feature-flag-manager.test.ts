import { FeatureFlagManager } from '../feature-flag-manager';
import type { FeatureFlag } from '../feature-flag-manager';

describe('FeatureFlagManager', () => {
  let manager: FeatureFlagManager;

  beforeEach(() => {
    manager = new FeatureFlagManager();
  });

  it('starts with no flags', () => {
    expect(manager.list()).toHaveLength(0);
  });

  it('registers and retrieves a flag', () => {
    manager.setFlag({ flagId: 'ff1', enabled: true, description: 'Feature one' });
    const flag = manager.getFlag('ff1');
    expect(flag).toBeDefined();
    expect(flag!.enabled).toBe(true);
  });

  it('isEnabled returns true for enabled flags', () => {
    manager.setFlag({ flagId: 'ff1', enabled: true, description: 'A' });
    expect(manager.isEnabled('ff1')).toBe(true);
  });

  it('isEnabled returns false for disabled flags', () => {
    manager.setFlag({ flagId: 'ff1', enabled: false, description: 'A' });
    expect(manager.isEnabled('ff1')).toBe(false);
  });

  it('isEnabled returns false for unknown flags', () => {
    expect(manager.isEnabled('nonexistent')).toBe(false);
  });

  it('lists all registered flags', () => {
    manager.setFlag({ flagId: 'a', enabled: true, description: 'A' });
    manager.setFlag({ flagId: 'b', enabled: false, description: 'B' });
    expect(manager.list()).toHaveLength(2);
  });

  it('updates existing flag on re-registration', () => {
    manager.setFlag({ flagId: 'ff1', enabled: false, description: 'Off' });
    manager.setFlag({ flagId: 'ff1', enabled: true, description: 'On' });
    expect(manager.getFlag('ff1')!.enabled).toBe(true);
    expect(manager.list()).toHaveLength(1);
  });

  it('removes a flag', () => {
    manager.setFlag({ flagId: 'ff1', enabled: true, description: 'A' });
    manager.remove('ff1');
    expect(manager.getFlag('ff1')).toBeUndefined();
    expect(manager.list()).toHaveLength(0);
  });
});
