import { ContextSerializer } from '../src/serializer';

describe('ContextSerializer', () => {
  const serializer = new ContextSerializer();
  const mockComposed = {
    items: [
      { id: '1', content: 'Implementar autenticação JWT', source: 'decisions', category: 'decision' as const, priority: 10, confidence: 0.9, freshness: 1, tokenCount: 5, timestamp: new Date().toISOString(), tags: ['auth', 'jwt'], score: 9.5, scoreReasons: ['high_confidence'] },
    ],
    totalTokens: 5,
    tokenBudget: 1000,
    utilization: 1,
    sourcesUsed: ['decisions'],
    provenance: [{ itemId: '1', action: 'included' as const, reason: 'relevant', source: 'decisions' }],
    composedAt: new Date().toISOString(),
    summary: '1 item from 1 source',
  };

  it('serializes in compact format', () => {
    const output = serializer.serialize(mockComposed, 'compact');
    expect(output).toContain('[CONTEXT]');
    expect(output).toContain('decisions');
    expect(output).toContain('5/1000');
  });

  it('serializes in full format', () => {
    const output = serializer.serialize(mockComposed, 'full');
    expect(output).toContain('Context Report');
    expect(output).toContain('Provenance');
  });

  it('serializes in minimal format', () => {
    const output = serializer.serialize(mockComposed, 'minimal');
    expect(output).toContain('ctx:1');
    expect(output).toContain('tok:5');
  });

  it('estimates tokens', () => {
    const count = serializer.estimateTokens('hello world');
    expect(count).toBeGreaterThan(0);
  });
});
