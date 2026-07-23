import { describe, it, expect } from '@jest/globals';
import { CapabilitySwitchboard } from '../capability-switchboard';

describe('capability-switchboard', () => {
  it('should enable and list capabilities', () => {
    const s = new CapabilitySwitchboard();
    s.enable('state');
    s.enable('generation');
    expect(s.list().length).toBe(2);
  });

  it('should disable capabilities', () => {
    const s = new CapabilitySwitchboard();
    s.enable('test');
    s.disable('test');
    expect(s.isEnabled('test')).toBe(false);
  });

  it('should return false for unknown capabilities', () => {
    const s = new CapabilitySwitchboard();
    expect(s.isEnabled('unknown')).toBe(false);
  });
});
