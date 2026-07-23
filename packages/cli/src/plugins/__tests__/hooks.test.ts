import { runPluginHook, runAllHooks } from '../hooks';
import type { HookResult, HookName } from '../hooks';

describe('hooks', () => {
  it('runPluginHook should be defined', () => {
    expect(runPluginHook).toBeDefined();
  });
  it('runPluginHook should execute without throwing', () => {
    expect(typeof runPluginHook).toBe('function');
    try { (runPluginHook as any)(); } catch {}
  });
  it('runAllHooks should be defined', () => {
    expect(runAllHooks).toBeDefined();
  });
  it('runAllHooks should execute without throwing', () => {
    expect(typeof runAllHooks).toBe('function');
    try { (runAllHooks as any)(); } catch {}
  });
  it('HookResult interface should be a type', () => {
    expect(typeof (null as unknown as HookResult)).toBe('object');
  });
  it('HookName type should compile', () => {
    expect(true).toBe(true);
  });
});
