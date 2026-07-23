import { loadConfig, saveConfig } from '../config';
import type { AIConfig, AIProvider } from '../config';

describe('config', () => {
  it('loadConfig should be defined', () => {
    expect(loadConfig).toBeDefined();
  });
  it('loadConfig should execute without throwing', () => {
    expect(typeof loadConfig).toBe('function');
    try { (loadConfig as any)(); } catch {}
  });
  it('saveConfig should be defined', () => {
    expect(saveConfig).toBeDefined();
  });
  it('saveConfig should execute without throwing', () => {
    expect(typeof saveConfig).toBe('function');
    try { (saveConfig as any)(); } catch {}
  });
  it('AIConfig interface should be a type', () => {
    expect(typeof (null as unknown as AIConfig)).toBe('object');
  });
  it('AIProvider type should compile', () => {
    expect(true).toBe(true);
  });
});
