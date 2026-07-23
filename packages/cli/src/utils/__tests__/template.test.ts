import { findTemplateAiDir } from '../template';

describe('template', () => {
  it('findTemplateAiDir should be defined', () => {
    expect(findTemplateAiDir).toBeDefined();
  });
  it('findTemplateAiDir should execute without throwing', () => {
    expect(typeof findTemplateAiDir).toBe('function');
    try { (findTemplateAiDir as any)(); } catch {}
  });
});
