import { FeedbackPrioritizer } from '../src/prioritizer';
import type { FeedbackEntry } from '../src/types';
import type { ClassificationResult } from '../src/classifier';

function makeFeedback(id: string, content: string, severity: FeedbackEntry['severity'] = 'info', type: FeedbackEntry['type'] = 'issue'): FeedbackEntry {
  return { id, type, source: 'user', targetType: 'test', targetId: 't1', content, severity, decision: 'pending', createdAt: new Date().toISOString(), tags: [] };
}

describe('FeedbackPrioritizer', () => {
  const prioritizer = new FeedbackPrioritizer();

  it('should assign critical priority for high severity', () => {
    const feedback = makeFeedback('1', 'Critical failure', 'critical');
    const result = prioritizer.prioritize([{ feedback }]);
    expect(result[0].priority).toBe('critical');
    expect(result[0].impact).toBe(4);
  });

  it('should assign high priority for error severity', () => {
    const feedback = makeFeedback('2', 'Error occurred', 'error');
    const result = prioritizer.prioritize([{ feedback }]);
    expect(result[0].priority).toBe('high');
  });

  it('should assign medium priority for warning severity with medium effort', () => {
    const feedback = makeFeedback('3', 'Warning message of moderate length', 'warning');
    const result = prioritizer.prioritize([{ feedback }]);
    expect(result[0].priority).toBe('medium');
  });

  it('should assign low priority for info severity with short content', () => {
    const feedback = makeFeedback('4', 'ok', 'info');
    const result = prioritizer.prioritize([{ feedback }]);
    expect(result[0].priority).toBe('low');
  });

  it('should use classification category when severity is info', () => {
    const feedback = makeFeedback('5', 'login broken', 'info');
    const classification: ClassificationResult = { category: 'bug', confidence: 0.8, matchedKeywords: ['broken'] };
    const result = prioritizer.prioritize([{ feedback, classification }]);
    expect(result[0].impact).toBe(4);
  });

  it('should estimate high effort for long content', () => {
    const feedback = makeFeedback('6', 'x'.repeat(600), 'info');
    const result = prioritizer.prioritize([{ feedback }]);
    expect(result[0].effort).toBe(4);
  });

  it('should return the matrix', () => {
    const matrix = prioritizer.getMatrix();
    expect(matrix.length).toBe(4);
    expect(matrix[0].length).toBe(4);
    expect(matrix[0][0].priority).toBe('critical');
    expect(matrix[3][3].priority).toBe('low');
  });
});
