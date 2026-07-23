import { FusionEngine } from '../src/fusion-engine';

describe('FusionEngine', () => {
  const engine = new FusionEngine();

  it('merges multiple agent outputs', () => {
    const result = engine.fuse([
      { agentRole: 'architect', output: 'Use Clean Architecture', confidence: 0.9, artifacts: ['diagram.png'] },
      { agentRole: 'programmer', output: 'Implement repositories', confidence: 0.85, artifacts: ['code.ts'] },
    ]);
    expect(result.merged).toContain('ARCHITECT');
    expect(result.merged).toContain('PROGRAMMER');
    expect(result.artifacts).toContain('code.ts');
  });

  it('deduplicates artifacts', () => {
    const result = engine.fuse([
      { agentRole: 'tester', output: 'tests', confidence: 0.8, artifacts: ['test.ts', 'test.ts'] },
    ]);
    expect(result.artifacts.length).toBe(1);
  });

  it('handles empty inputs', () => {
    const result = engine.fuse([]);
    expect(result.merged).toBe('');
    expect(result.confidence).toBe(0);
  });
});
