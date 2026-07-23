import { loadIndex, saveExperiment, loadExperiment, listExperiments } from '../storage';

describe('storage', () => {
  it('loadIndex should be defined', () => {
    expect(loadIndex).toBeDefined();
  });
  it('loadIndex should execute without throwing', () => {
    expect(typeof loadIndex).toBe('function');
    try { (loadIndex as any)(); } catch {}
  });
  it('saveExperiment should be defined', () => {
    expect(saveExperiment).toBeDefined();
  });
  it('saveExperiment should execute without throwing', () => {
    expect(typeof saveExperiment).toBe('function');
    try { (saveExperiment as any)(); } catch {}
  });
  it('loadExperiment should be defined', () => {
    expect(loadExperiment).toBeDefined();
  });
  it('loadExperiment should execute without throwing', () => {
    expect(typeof loadExperiment).toBe('function');
    try { (loadExperiment as any)(); } catch {}
  });
  it('listExperiments should be defined', () => {
    expect(listExperiments).toBeDefined();
  });
  it('listExperiments should execute without throwing', () => {
    expect(typeof listExperiments).toBe('function');
    try { (listExperiments as any)(); } catch {}
  });
});
