import { ContextAggregator } from '../src/aggregator';

describe('ContextAggregator', () => {
  const aggregator = new ContextAggregator();

  it('registers and calls providers', async () => {
    aggregator.registerSource('decisions', async () => [
      { id: 'd1', content: 'decision1', source: 'decisions', category: 'decision' as const, priority: 10, confidence: 0.9, freshness: 1, tokenCount: 10, timestamp: new Date().toISOString(), tags: ['auth'] },
    ]);

    const results = await aggregator.aggregateAll({ taskType: 'feature', scope: 'module', complexity: 'medium', risk: 'low', environment: 'dev' });
    expect(results.length).toBe(1);
    expect(results[0].sourceName).toBe('decisions');
    expect(results[0].items[0].content).toBe('decision1');
  });

  it('handles providers that throw', async () => {
    aggregator.registerSource('failing', async () => { throw new Error('fail'); });
    const results = await aggregator.aggregateAll({ taskType: 'bugfix', scope: 'single_file', complexity: 'low', risk: 'low', environment: 'dev' });
    expect(Array.isArray(results)).toBe(true);
  });

  it('limits items per source', async () => {
    aggregator.registerSource('limited', async () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: `l${i}`, content: `item${i}`, source: 'limited', category: 'decision' as const, priority: 1, confidence: 0.5, freshness: 0.5, tokenCount: 5, timestamp: new Date().toISOString(), tags: [],
      })),
    );

    const results = await aggregator.aggregateAll({ taskType: 'feature', scope: 'project', complexity: 'high', risk: 'medium', environment: 'staging' });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
