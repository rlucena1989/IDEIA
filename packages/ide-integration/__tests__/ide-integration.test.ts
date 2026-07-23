import { IDEIntegration } from '../src/ide-integration';

describe('IDEIntegration', () => {
  it('should submit feedback and create trace link', async () => {
    const ide = new IDEIntegration();
    const fb = await ide.submitFeedback({ type: 'suggestion', source: 'user', targetType: 'workflow_task', targetId: 'task-1', content: 'Add validation' }, 'tester');
    expect(fb.id).toBeDefined();
    const traces = ide.traceRegistry.getBySource('feedback_event', fb.id);
    expect(traces).toHaveLength(1);
    expect(traces[0].targetId).toBe('task-1');
  });

  it('should process feedback and emit event', async () => {
    const ide = new IDEIntegration();
    const fb = await ide.submitFeedback({ type: 'issue', source: 'ai', targetType: 'code_file', targetId: 'src/auth.ts', content: 'Missing validation', severity: 'error' }, 'ai-agent');
    await ide.processFeedback(fb.id);
    const recs = ide.feedbackPipeline.getAllRecommendations();
    expect(recs).toHaveLength(1);
  });

  it('should create trace link and emit trace.linked event', async () => {
    const ide = new IDEIntegration();
    let eventReceived = false;
    ide.eventBus.subscribe('trace.linked', () => { eventReceived = true; });
    await ide.createTraceLink({ sourceType: 'requirement', sourceId: 'req-1', targetType: 'workflow_task', targetId: 'task-1', relationship: 'implements' });
    expect(eventReceived).toBe(true);
  });

  it('should evaluate policy and emit violation', async () => {
    const ide = new IDEIntegration();
    let violationEmitted = false;
    ide.eventBus.subscribe('policy.violated', () => { violationEmitted = true; });
    const res = await ide.evaluatePolicy({ actionType: 'file.delete', riskLevel: 'high' });
    expect(res.decision).toBe('block');
    expect(violationEmitted).toBe(true);
  });

  it('should auto-log policy violations as feedback', async () => {
    const ide = new IDEIntegration();
    await ide.evaluatePolicy({ actionType: 'shell.exec', resource: 'rm -rf /', actor: 'ai-agent' });
    const fb = ide.feedbackPipeline.getAllFeedback();
    expect(fb.length).toBeGreaterThan(0);
    expect(fb.some((f: { content: string }) => f.content.includes('destructive root operation'))).toBe(true);
  });

  it('should complete cycle', async () => {
    const ide = new IDEIntegration();
    let cycleCompleted = false;
    ide.eventBus.subscribe('cycle.completed', () => { cycleCompleted = true; });
    await ide.completeCycle({ loop: 5 });
    expect(cycleCompleted).toBe(true);
  });

  it('should support event subscriptions', async () => {
    const ide = new IDEIntegration();
    const events: string[] = [];
    ide.onEvent('*', (e) => { events.push(e.type); });
    await ide.completeCycle({ loop: 1 });
    await ide.evaluatePolicy({ actionType: 'file.delete', riskLevel: 'high' });
    expect(events.length).toBeGreaterThanOrEqual(2);
  });
});
