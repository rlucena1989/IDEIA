import { RelevanceScorer } from '../src/scorer';

describe('RelevanceScorer', () => {
  const scorer = new RelevanceScorer();

  it('scores items and returns sorted', () => {
    const items = [
      { id: '1', content: 'auth decision', source: 'decisions', category: 'decision' as const, priority: 10, confidence: 0.9, freshness: 1, tokenCount: 10, timestamp: new Date().toISOString(), tags: ['auth'] },
      { id: '2', content: 'old log', source: 'logs', category: 'log' as const, priority: 1, confidence: 0.3, freshness: 0.1, tokenCount: 10, timestamp: new Date().toISOString(), tags: [] },
    ];

    const scored = scorer.score(items, { taskType: 'feature', scope: 'module', complexity: 'medium', risk: 'low', environment: 'dev' });
    expect(scored.length).toBeGreaterThanOrEqual(1);
    expect(scored[0].score).toBeGreaterThanOrEqual(scored[scored.length - 1].score);
  });

  it('sorts items by score descending', () => {
    const items = [
      { id: '1', content: 'high priority decision', source: 'decisions', category: 'decision' as const, priority: 10, confidence: 0.9, freshness: 1, tokenCount: 10, timestamp: new Date().toISOString(), tags: ['auth'] },
      { id: '2', content: 'low priority log', source: 'logs', category: 'log' as const, priority: 1, confidence: 0.5, freshness: 0.2, tokenCount: 10, timestamp: new Date().toISOString(), tags: [] },
    ];
    const scored = scorer.score(items, { taskType: 'feature', scope: 'module', complexity: 'medium', risk: 'low', environment: 'dev' });
    expect(scored[0].score).toBeGreaterThanOrEqual(scored[scored.length - 1].score);
  });
});
