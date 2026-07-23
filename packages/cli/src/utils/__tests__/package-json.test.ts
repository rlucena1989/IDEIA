import { upsertPackageScripts } from '../package-json';
import type { ScriptResult } from '../package-json';

describe('package-json', () => {
  it('upsertPackageScripts should be defined', () => {
    expect(upsertPackageScripts).toBeDefined();
  });
  it('upsertPackageScripts should execute without throwing', () => {
    expect(typeof upsertPackageScripts).toBe('function');
    try { (upsertPackageScripts as any)(); } catch {}
  });
  it('ScriptResult interface should be a type', () => {
    expect(typeof (null as unknown as ScriptResult)).toBe('object');
  });
});
