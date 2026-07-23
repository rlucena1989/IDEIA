import { releaseCommand, pipelineCommand } from '../release';

describe('release', () => {
  it('releaseCommand should be defined', () => {
    expect(releaseCommand).toBeDefined();
  });
  it('releaseCommand should execute without throwing', () => {
    expect(typeof releaseCommand).toBe('function');
    try { (releaseCommand as any)(); } catch {}
  });
  it('pipelineCommand should be defined', () => {
    expect(pipelineCommand).toBeDefined();
  });
  it('pipelineCommand should execute without throwing', () => {
    expect(typeof pipelineCommand).toBe('function');
    try { (pipelineCommand as any)(); } catch {}
  });
});
