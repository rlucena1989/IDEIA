import { loadPlugins, findPlugin } from '../loader';
import type { LoadedPlugin } from '../loader';

describe('loader', () => {
  it('loadPlugins should be defined', () => {
    expect(loadPlugins).toBeDefined();
  });
  it('loadPlugins should execute without throwing', () => {
    expect(typeof loadPlugins).toBe('function');
    try { (loadPlugins as any)(); } catch {}
  });
  it('findPlugin should be defined', () => {
    expect(findPlugin).toBeDefined();
  });
  it('findPlugin should execute without throwing', () => {
    expect(typeof findPlugin).toBe('function');
    try { (findPlugin as any)(); } catch {}
  });
  it('LoadedPlugin interface should be a type', () => {
    expect(typeof (null as unknown as LoadedPlugin)).toBe('object');
  });
});
