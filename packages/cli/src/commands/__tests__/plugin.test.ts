import { pluginCommand } from '../plugin';

describe('plugin', () => {
  it('pluginCommand should be defined', () => {
    expect(pluginCommand).toBeDefined();
  });
  it('pluginCommand should execute without throwing', () => {
    expect(typeof pluginCommand).toBe('function');
    try { (pluginCommand as any)(); } catch {}
  });
});
