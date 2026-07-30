import { AITestMaintenanceEngine } from './ai-maintenance-engine';
import { AnalysisContext } from '../types';

describe('AITestMaintenanceEngine', () => {
  const engine = new AITestMaintenanceEngine();

  it('should repair simple changes', async () => {
    const ctx: AnalysisContext = {
      sourceFile: 'math.ts', sourceCode: '',
      exports: [], dependencies: [], types: [], existingTests: [],
    };
    const results = await engine.handleCodeChange('changed "foo" to "bar"', [ctx]);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('repaired');
  });

  it('should skip complex changes like renames', async () => {
    const ctx: AnalysisContext = {
      sourceFile: 'service.ts', sourceCode: '',
      exports: [], dependencies: [], types: [], existingTests: [],
    };
    const results = await engine.handleCodeChange('rename from OldName to NewName', [ctx]);
    expect(results[0].status).toBe('skipped');
  });

  it('should return repair stats', () => {
    const stats = engine.getRepairStats();
    expect(stats.totalRepairs).toBeDefined();
    expect(stats.successRate).toBeDefined();
  });
});
