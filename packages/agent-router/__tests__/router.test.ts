import { AgentRouter, createAgentRouter } from '../src/index';

describe('AgentRouter (integration)', () => {
  const router = createAgentRouter();

  it('classifies and selects route for simple task', () => {
    const { classification, pipeline } = router.getPipelineForCriteria({
      fileCount: 1, riskLevel: 'low', estimatedSteps: 1, requiresHistoricalContext: false,
      environmentSensitivity: 'dev', dependencies: 0, hasUI: false, hasDatabase: false, hasExternalAPI: false,
    });
    expect(classification.level).toBe('N0');
    expect(pipeline.maxSteps).toBeGreaterThanOrEqual(1);
  });

  it('classifies and selects route for complex task', () => {
    const { classification, pipeline } = router.getPipelineForCriteria({
      fileCount: 25, riskLevel: 'critical', estimatedSteps: 20, requiresHistoricalContext: true,
      environmentSensitivity: 'production', dependencies: 15, hasUI: true, hasDatabase: true, hasExternalAPI: true,
    });
    expect(classification.level).toBe('N5');
    expect(pipeline.requireApproval).toBe(true);
  });

  it('resolves consensus', () => {
    const result = router.resolveConsensus([
      { agentRole: 'programmer', decision: 'implementar feature', confidence: 0.9, evidence: [] },
      { agentRole: 'reviewer', decision: 'implementar feature', confidence: 0.8, evidence: [] },
    ]);
    expect(result.reached).toBe(true);
  });

  it('fuses results', () => {
    const result = router.fuseResults([
      { agentRole: 'architect', output: 'design', confidence: 0.9, artifacts: [] },
      { agentRole: 'programmer', output: 'code', confidence: 0.85, artifacts: ['main.ts'] },
    ]);
    expect(result.merged).toContain('ARCHITECT');
  });
});
