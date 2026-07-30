import { FeedbackClassifier } from '../src/classifier';
import type { FeedbackEntry } from '../src/types';

function makeFeedback(id: string, content: string, type: FeedbackEntry['type'] = 'issue', severity: FeedbackEntry['severity'] = 'info'): FeedbackEntry {
  return { id, type, source: 'user', targetType: 'test', targetId: 't1', content, severity, decision: 'pending', createdAt: new Date().toISOString(), tags: [] };
}

describe('FeedbackClassifier', () => {
  const classifier = new FeedbackClassifier();

  it('should classify bug reports', () => {
    const entry = makeFeedback('1', 'The application crashes when I click submit. Got an exception stack trace.');
    const result = classifier.classify(entry);
    expect(result.category).toBe('bug');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });

  it('should classify feature requests', () => {
    const entry = makeFeedback('2', 'I would like a new feature: dark mode support');
    const result = classifier.classify(entry);
    expect(result.category).toBe('feature');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify improvement suggestions', () => {
    const entry = makeFeedback('3', 'We should improve the performance of the search. It is too slow.');
    const result = classifier.classify(entry);
    expect(result.category).toBe('improvement');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify questions', () => {
    const entry = makeFeedback('4', 'How do I configure the authentication?');
    const result = classifier.classify(entry);
    expect(result.category).toBe('question');
  });

  it('should classify short ambiguous content as question with low confidence', () => {
    const entry = makeFeedback('5', 'hello');
    const result = classifier.classify(entry);
    expect(result.category).toBe('question');
    expect(result.confidence).toBeLessThanOrEqual(0.3);
  });

  it('should classify batch of entries', () => {
    const entries = [
      makeFeedback('a', 'bug: login broken'),
      makeFeedback('b', 'how does this work?'),
    ];
    const results = classifier.classifyBatch(entries);
    expect(results.size).toBe(2);
    expect(results.get('a')!.category).toBe('bug');
    expect(results.get('b')!.category).toBe('question');
  });

  it('should return metadata with per-category scores', () => {
    const entry = makeFeedback('6', 'this is broken and slow');
    const result = classifier.classify(entry);
    expect(result.metadata).toBeDefined();
    const scores = result.metadata!.scores as Array<{ category: string; score: number }>;
    expect(scores.length).toBe(4);
    expect(scores.sort((a, b) => a.category.localeCompare(b.category)).map(s => s.category)).toEqual(['bug', 'feature', 'improvement', 'question']);
  });
});
