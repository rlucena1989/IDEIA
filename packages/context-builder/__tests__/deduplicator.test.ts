import { ContextDeduplicator } from '../src/deduplicator';

describe('ContextDeduplicator', () => {
  const dedup = new ContextDeduplicator(0.85);

  it('removes duplicate items with same content', () => {
    const items = [
      { id: '1', content: 'Implementar autenticação JWT', source: 'decisions', category: 'decision' as const, priority: 10, confidence: 0.9, freshness: 1, tokenCount: 10, timestamp: new Date().toISOString(), tags: ['auth'] },
      { id: '2', content: 'Implementar autenticação JWT', source: 'decisions', category: 'decision' as const, priority: 5, confidence: 0.5, freshness: 0.5, tokenCount: 10, timestamp: new Date().toISOString(), tags: ['auth'] },
    ];
    const result = dedup.deduplicate(items);
    expect(result.length).toBe(1);
  });

  it('keeps item with highest confidence', () => {
    const items = [
      { id: '1', content: 'Implementar autenticação JWT', source: 'decisions', category: 'decision' as const, priority: 5, confidence: 0.5, freshness: 0.5, tokenCount: 10, timestamp: new Date().toISOString(), tags: ['auth'] },
      { id: '2', content: 'Implementar autenticação JWT', source: 'decisions', category: 'decision' as const, priority: 10, confidence: 0.9, freshness: 1, tokenCount: 10, timestamp: new Date().toISOString(), tags: ['auth'] },
    ];
    const result = dedup.deduplicate(items);
    expect(result[0].confidence).toBe(0.9);
  });
});
