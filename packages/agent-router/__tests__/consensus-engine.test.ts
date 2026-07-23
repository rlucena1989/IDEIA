import { ConsensusEngine } from '../src/consensus-engine';

describe('ConsensusEngine', () => {
  const engine = new ConsensusEngine();

  it('reaches consensus when majority agrees', () => {
    const opinions = [
      { agentRole: 'programmer' as const, decision: 'usar JWT', confidence: 0.9, evidence: ['best practice'] },
      { agentRole: 'architect' as const, decision: 'usar JWT', confidence: 0.85, evidence: ['padrão'] },
      { agentRole: 'reviewer' as const, decision: 'usar OAuth', confidence: 0.7, evidence: ['alternativa'] },
    ];
    const result = engine.reachConsensus(opinions);
    expect(result.reached).toBe(true);
    expect(result.finalDecision).toBe('usar JWT');
    expect(result.supportingAgents).toContain('programmer');
    expect(result.dissentingAgents).toContain('reviewer');
  });

  it('does not reach consensus with low confidence', () => {
    const opinions = [
      { agentRole: 'programmer' as const, decision: 'A', confidence: 0.3, evidence: [] },
      { agentRole: 'tester' as const, decision: 'B', confidence: 0.4, evidence: [] },
    ];
    const result = engine.reachConsensus(opinions);
    expect(result.reached).toBe(false);
  });

  it('handles empty opinions', () => {
    const result = engine.reachConsensus([]);
    expect(result.reached).toBe(false);
  });

  it('weights supervisor opinions higher', () => {
    const opinions = [
      { agentRole: 'programmer' as const, decision: 'A', confidence: 0.9, evidence: [] },
      { agentRole: 'supervisor' as const, decision: 'B', confidence: 0.6, evidence: ['strategic'] },
    ];
    const result = engine.reachConsensus(opinions);
    expect(result.finalDecision).toBe('B');
  });
});
