import { ContextComposer } from '../src/composer';

describe('ContextComposer (integration)', () => {
  const composer = new ContextComposer({ defaultTokenBudget: 2000 });

  beforeEach(() => {
    composer.aggregator.registerSource('decisions', async () => [
      { id: 'd1', content: 'Usar JWT para autenticação', source: 'decisions', category: 'decision' as const, priority: 10, confidence: 0.9, freshness: 1, tokenCount: 15, timestamp: new Date().toISOString(), tags: ['auth', 'jwt'] },
      { id: 'd2', content: 'Manter padrão Repository', source: 'decisions', category: 'decision' as const, priority: 8, confidence: 0.85, freshness: 0.8, tokenCount: 12, timestamp: new Date().toISOString(), tags: ['architecture'] },
    ]);
    composer.aggregator.registerSource('patterns', async () => [
      { id: 'p1', content: 'NestJS modules structure', source: 'patterns', category: 'pattern' as const, priority: 7, confidence: 0.8, freshness: 0.9, tokenCount: 10, timestamp: new Date().toISOString(), tags: ['nestjs'] },
    ]);
    composer.aggregator.registerSource('logs', async () => [
      { id: 'l1', content: 'Error: connection refused', source: 'logs', category: 'log' as const, priority: 2, confidence: 0.9, freshness: 0.1, tokenCount: 8, timestamp: new Date().toISOString(), tags: ['error'] },
    ]);
  });

  it('composes context from all registered sources', async () => {
    const result = await composer.compose(
      { taskType: 'feature', scope: 'module', complexity: 'medium', risk: 'low', environment: 'dev' },
    );
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.sourcesUsed.length).toBeGreaterThanOrEqual(2);
    expect(result.totalTokens).toBeLessThanOrEqual(result.tokenBudget);
    expect(result.composedAt).toBeTruthy();
  });

  it('respects token budget', async () => {
    const result = await composer.compose(
      { taskType: 'bugfix', scope: 'single_file', complexity: 'low', risk: 'low', environment: 'dev' },
      undefined,
      50,
    );
    expect(result.totalTokens).toBeLessThanOrEqual(50);
  });

  it('records provenance', async () => {
    const result = await composer.compose(
      { taskType: 'refactor', scope: 'module', complexity: 'high', risk: 'medium', environment: 'staging' },
    );
    expect(result.provenance.length).toBeGreaterThan(0);
    expect(result.provenance.some(p => p.action === 'included')).toBe(true);
  });

  it('includes summary', async () => {
    const result = await composer.compose(
      { taskType: 'question', scope: 'single_file', complexity: 'low', risk: 'low', environment: 'dev' },
    );
    expect(result.summary).toContain('Context:');
  });

  it('sorts items by score descending', async () => {
    const result = await composer.compose(
      { taskType: 'feature', scope: 'project', complexity: 'high', risk: 'medium', environment: 'production' },
    );
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i - 1].score).toBeGreaterThanOrEqual(result.items[i].score);
    }
  });
});
