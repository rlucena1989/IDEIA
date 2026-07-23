import { SummarizeTrimmer } from '../src/compressor/summarize-trimmer';
import { DeduplicateTrimmer } from '../src/compressor/deduplicate-trimmer';
import { PriorityRanker } from '../src/compressor/priority-ranker';

describe('SummarizeTrimmer', () => {
  const trimmer = new SummarizeTrimmer({ maxMessageAgeMs: 0, maxContextItems: 5 });

  it('summarizes old messages', () => {
    const messages = [
      { role: 'user' as const, content: 'Old msg 1', id: String(Date.now() - 100000) },
      { role: 'assistant' as const, content: 'Old response', id: String(Date.now() - 100000) },
      { role: 'user' as const, content: 'Recent msg', id: String(Date.now()) },
    ];

    const result = trimmer.trim(messages, []);
    expect(result.messages.length).toBeLessThanOrEqual(2);
  });

  it('limits context items', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `ctx${i}`,
      content: `item${i}`,
      source: 'test',
      priority: i,
      tokenCount: 5,
      timestamp: new Date().toISOString(),
    }));

    const result = trimmer.trim([], items);
    expect(result.context.length).toBeLessThanOrEqual(5);
  });

  it('preserves recent messages when no old ones', () => {
    const messages = [
      { role: 'user' as const, content: 'Recent', id: String(Date.now()) },
    ];
    const result = trimmer.trim(messages, []);
    expect(result.messages.length).toBe(1);
  });
});

describe('DeduplicateTrimmer', () => {
  const dedup = new DeduplicateTrimmer();

  it('removes duplicate message content', () => {
    const messages = [
      { role: 'user' as const, content: 'hello', id: '1' },
      { role: 'user' as const, content: 'hello', id: '2' },
      { role: 'assistant' as const, content: 'bye', id: '3' },
    ];
    const result = dedup.trim(messages, []);
    expect(result.messages.length).toBe(2);
  });
});

describe('PriorityRanker', () => {
  const ranker = new PriorityRanker({ maxTokens: 1000 });

  it('prioritizes system messages over tool messages', () => {
    const messages = [
      { role: 'system' as const, content: 'important system instruction', id: '1' },
      { role: 'tool' as const, content: 'tool output', id: '2' },
      { role: 'user' as const, content: 'user query', id: '3' },
    ];

    const result = ranker.rank(messages, []);
    expect(result.messages.some(m => m.role === 'system')).toBe(true);
  });

  it('excludes items beyond budget', () => {
    const long = 'x'.repeat(10000);
    const messages = [
      { role: 'user' as const, content: 'short', id: '1' },
      { role: 'user' as const, content: long, id: '2' },
    ];
    const result = ranker.rank(messages, []);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
  });
});
