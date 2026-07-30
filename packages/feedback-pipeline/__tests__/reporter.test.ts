import { FeedbackReporter } from '../src/reporter';
import type { FeedbackEntry } from '../src/types';

function makeFeedback(id: string, content: string, createdAt: string, type: FeedbackEntry['type'] = 'issue', severity: FeedbackEntry['severity'] = 'info'): FeedbackEntry {
  return { id, type, source: 'user', targetType: 'test', targetId: 't1', content, severity, decision: 'pending', createdAt, tags: [] };
}

describe('FeedbackReporter', () => {
  let reporter: FeedbackReporter;

  beforeEach(() => {
    reporter = new FeedbackReporter();
    const week1 = '2026-07-13T10:00:00Z';
    const week2 = '2026-07-20T10:00:00Z';
    reporter.addItem(makeFeedback('1', 'crash bug', week1), { category: 'bug', confidence: 0.9, matchedKeywords: ['crash'] }, 'critical');
    reporter.addItem(makeFeedback('2', 'feature request', week1), { category: 'feature', confidence: 0.8, matchedKeywords: ['feature'] }, 'medium');
    reporter.addItem(makeFeedback('3', 'performance issue', week2), { category: 'improvement', confidence: 0.7, matchedKeywords: ['performance'] }, 'high');
    reporter.addItem(makeFeedback('4', 'how to?', week2), { category: 'question', confidence: 0.6, matchedKeywords: ['how'] }, 'low');
  });

  it('should generate weekly report grouped by week', () => {
    const weeks = reporter.weeklyReport();
    expect(weeks).toHaveLength(2);
    expect(weeks[0].weekStart).toBe('2026-07-13');
    expect(weeks[0].total).toBe(2);
    expect(weeks[1].weekStart).toBe('2026-07-20');
    expect(weeks[1].total).toBe(2);
  });

  it('should generate category report sorted by count', () => {
    const report = reporter.categoryReport();
    expect(report.total).toBe(4);
    expect(report.categories.length).toBe(4);
    expect(report.categories[0].category).toBe('bug');
    expect(report.categories[1].category).toBe('feature');
  });

  it('should generate priority report in order', () => {
    const report = reporter.priorityReport();
    expect(report.total).toBe(4);
    expect(report.priorities[0].priority).toBe('critical');
    expect(report.priorities[1].priority).toBe('high');
    expect(report.priorities[2].priority).toBe('medium');
    expect(report.priorities[3].priority).toBe('low');
  });

  it('should export JSON format', () => {
    const json = reporter.export('json');
    const parsed = JSON.parse(json);
    expect(parsed.weekly).toHaveLength(2);
    expect(parsed.byCategory.categories).toHaveLength(4);
    expect(parsed.byPriority.priorities).toHaveLength(4);
  });

  it('should export CSV format', () => {
    const csv = reporter.export('csv');
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,type,source,severity,createdAt,category,priority');
    expect(lines).toHaveLength(5);
    expect(lines[1]).toContain('bug');
  });

  it('should export text format', () => {
    const text = reporter.export('text');
    expect(text).toContain('=== Feedback Report ===');
    expect(text).toContain('Total: 4');
    expect(text).toContain('--- Weekly ---');
    expect(text).toContain('--- By Category ---');
    expect(text).toContain('--- By Priority ---');
  });

  it('should set items via setItems', () => {
    const r = new FeedbackReporter();
    r.setItems([{ feedback: makeFeedback('x', 'test', '2026-07-01T00:00:00Z') }]);
    expect(r.weeklyReport()[0].total).toBe(1);
  });

  it('should handle empty reporter', () => {
    const r = new FeedbackReporter();
    expect(r.weeklyReport()).toHaveLength(0);
    expect(r.categoryReport().total).toBe(0);
    expect(r.priorityReport().total).toBe(0);
  });
});
