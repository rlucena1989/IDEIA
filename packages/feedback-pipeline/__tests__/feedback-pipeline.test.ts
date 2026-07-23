import { FeedbackPipeline } from '../src/feedback-pipeline';

describe('FeedbackPipeline', () => {
  it('should submit feedback', () => {
    const pipe = new FeedbackPipeline();
    const fb = pipe.submit({ type: 'suggestion', source: 'user', targetType: 'workflow_task', targetId: 'task-1', content: 'Add validation' });
    expect(fb.id).toBeDefined();
    expect(fb.decision).toBe('pending');
  });

  it('should process feedback into recommendation', () => {
    const pipe = new FeedbackPipeline();
    const fb = pipe.submit({ type: 'issue', source: 'ai', targetType: 'code_file', targetId: 'src/auth.ts', content: 'Missing input validation', severity: 'error' });
    const rec = pipe.process(fb.id);
    expect(rec).not.toBeNull();
    expect(rec!.type).toBe('fix');
    expect(rec!.priority).toBe('high');
    expect(rec!.status).toBe('open');
  });

  it('should generate memory from feedback', () => {
    const pipe = new FeedbackPipeline();
    const fb = pipe.submit({ type: 'rejection', source: 'reviewer', targetType: 'policy_rule', targetId: 'rule-1', content: 'Rule too permissive', severity: 'critical' });
    const rec = pipe.process(fb.id);
    const memory = pipe.getAllMemory();
    expect(memory).toHaveLength(1);
    expect(memory[0].type).toBe('pitfall');
    expect(memory[0].tags).toContain('blocking');
    expect(memory[0].sourceRecommendationId).toBe(rec!.id);
  });

  it('should process all pending feedback', () => {
    const pipe = new FeedbackPipeline();
    pipe.submit({ type: 'suggestion', source: 'user', targetType: 'workflow_task', targetId: 'task-1', content: 'Refactor' });
    pipe.submit({ type: 'issue', source: 'ci', targetType: 'code_file', targetId: 'src/main.ts', content: 'Test fails', severity: 'error' });
    const recs = pipe.processAll();
    expect(recs).toHaveLength(2);
    expect(pipe.count().recommendations).toBe(2);
    expect(pipe.count().memory).toBe(2);
  });

  it('should filter feedback by target', () => {
    const pipe = new FeedbackPipeline();
    pipe.submit({ type: 'comment', source: 'user', targetType: 'workflow_task', targetId: 'task-1', content: 'Looks good' });
    pipe.submit({ type: 'issue', source: 'user', targetType: 'code_file', targetId: 'src/main.ts', content: 'Bug' });
    const results = pipe.getFeedbackByTarget('workflow_task', 'task-1');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('comment');
  });

  it('should return null for non-existent feedback', () => {
    const pipe = new FeedbackPipeline();
    const rec = pipe.process('non-existent');
    expect(rec).toBeNull();
  });

  it('should retrieve individual items', () => {
    const pipe = new FeedbackPipeline();
    const fb = pipe.submit({ type: 'approval', source: 'user', targetType: 'workflow_task', targetId: 'task-1', content: 'Approved' });
    const fetched = pipe.getFeedback(fb.id);
    expect(fetched).toBeDefined();
    expect(fetched!.type).toBe('approval');
  });
});
