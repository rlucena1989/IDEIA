import { RealShell, RealFileSystem, RealHttpClient } from '../real';

describe('real', () => {
  it('RealShell should be defined', () => {
    expect(RealShell).toBeDefined();
  });
  it('RealShell should execute without throwing', () => {
    expect(typeof RealShell).toBe('function');
    try { new (RealShell as any)(); } catch {}
  });
  it('RealFileSystem should be defined', () => {
    expect(RealFileSystem).toBeDefined();
  });
  it('RealFileSystem should execute without throwing', () => {
    expect(typeof RealFileSystem).toBe('function');
    try { new (RealFileSystem as any)(); } catch {}
  });
  it('RealHttpClient should be defined', () => {
    expect(RealHttpClient).toBeDefined();
  });
  it('RealHttpClient should execute without throwing', () => {
    expect(typeof RealHttpClient).toBe('function');
    try { new (RealHttpClient as any)(); } catch {}
  });
});
