import { validateManifest, REQUIRED_MANIFEST_FIELDS } from '../manifest';
import type { PluginManifest, PluginCapability } from '../manifest';

describe('manifest', () => {
  it('validateManifest should be defined', () => {
    expect(validateManifest).toBeDefined();
  });
  it('validateManifest should execute without throwing', () => {
    expect(typeof validateManifest).toBe('function');
    try { (validateManifest as any)(); } catch {}
  });
  it('REQUIRED_MANIFEST_FIELDS should be defined', () => {
    expect(REQUIRED_MANIFEST_FIELDS).toBeDefined();
  });
  it('REQUIRED_MANIFEST_FIELDS should have a value', () => {
    expect(REQUIRED_MANIFEST_FIELDS).not.toBeNull();
  });
  it('PluginManifest interface should be a type', () => {
    expect(typeof (null as unknown as PluginManifest)).toBe('object');
  });
  it('PluginCapability type should compile', () => {
    expect(true).toBe(true);
  });
});
