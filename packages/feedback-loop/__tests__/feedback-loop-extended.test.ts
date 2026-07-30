import { FeedbackOrchestrator } from '../src/orchestrator';
import { LoopScheduler } from '../src/scheduler';

describe('FeedbackOrchestrator Extended', () => {
  let orchestrator: FeedbackOrchestrator;

  beforeEach(() => {
    orchestrator = new FeedbackOrchestrator();
  });

  it('should process a test failure event', async () => {
    const action = await orchestrator.onEvent({
      type: 'test_failure',
      source: 'jest-runner',
      data: { file: 'auth.test.ts', line: 42 },
      severity: 'high',
      timestamp: Date.now(),
    });
    expect(action.type).toBe('fix');
    expect(action.status).toBe('running');
    expect(action.eventId).toBeTruthy();
  });

  it('should process a metric degraded event', async () => {
    const action = await orchestrator.onEvent({
      type: 'metric_degraded',
      source: 'performance-monitor',
      data: { metric: 'response_time', value: 2500, threshold: 1000 },
      severity: 'medium',
      timestamp: Date.now(),
    });
    expect(action.type).toBe('fix');
  });

  it('should process an improvement suggestion', async () => {
    const action = await orchestrator.onEvent({
      type: 'improvement',
      source: 'system',
      data: { suggestion: 'Add input validation' },
      severity: 'low',
      timestamp: Date.now(),
    });
    expect(action.type).toBe('log');
  });

  it('should process a gate blocked event as critical', async () => {
    const action = await orchestrator.onEvent({
      type: 'gate_blocked',
      source: 'quality-gate',
      data: { gate: 'security' },
      severity: 'critical',
      timestamp: Date.now(),
    });
    expect(action.type).toBe('escalate');
  });

  it('should process a pattern detected event', async () => {
    const action = await orchestrator.onEvent({
      type: 'pattern_detected',
      source: 'pattern-learner',
      data: { pattern: 'slow-query', confidence: 0.85 },
      severity: 'low',
      timestamp: Date.now(),
    });
    expect(action.type).toBe('log');
  });

  it('should handle unknown event type gracefully', async () => {
    const action = await (orchestrator.onEvent as (event: Record<string, unknown>) => Promise<unknown>)({
      type: 'unknown_type_xyz',
      source: 'test',
      data: {},
      severity: 'low',
      timestamp: Date.now(),
    }) as { type: string; status: string; eventId: string };
    expect(action).toBeDefined();
    expect(action.type).toBe('log');
  });

  it('should register multiple patterns and find them', () => {
    orchestrator.registerPattern({ pattern: 'OOM Error', symptom: 'Out of memory', fix: 'Increase memory limit', frequency: 3, lastDetected: Date.now(), confidence: 0.9 });
    orchestrator.registerPattern({ pattern: 'Timeout Error', symptom: 'Request timeout', fix: 'Add retry logic', frequency: 2, lastDetected: Date.now(), confidence: 0.8 });
    expect(orchestrator.findPatterns('memory')).toHaveLength(1);
    expect(orchestrator.findPatterns('timeout')).toHaveLength(1);
  });

  it('should return empty for pattern search with no matches', () => {
    const found = orchestrator.findPatterns('nonexistent-pattern-xyz');
    expect(found).toHaveLength(0);
  });

  it('should process queue after multiple events', async () => {
    orchestrator.onEvent({ type: 'test_failure', source: 'ci', data: {}, severity: 'low', timestamp: Date.now() });
    orchestrator.onEvent({ type: 'metric_degraded', source: 'perf', data: {}, severity: 'low', timestamp: Date.now() });
    await orchestrator.processQueue();
    const stats = orchestrator.getStats();
    expect(stats.totalEvents).toBe(2);
    expect(stats.totalActions).toBe(2);
  });

  it('should track stats correctly with patterns', () => {
    orchestrator.registerPattern({ pattern: 'P1', symptom: 'S1', fix: 'F1', frequency: 1, lastDetected: Date.now(), confidence: 0.5 });
    orchestrator.registerPattern({ pattern: 'P2', symptom: 'S2', fix: 'F2', frequency: 1, lastDetected: Date.now(), confidence: 0.5 });
    const stats = orchestrator.getStats();
    expect(stats.patternsCount).toBe(2);
  });

  it('should determine top severity correctly', async () => {
    orchestrator.onEvent({ type: 'test_failure', source: 'ci', data: {}, severity: 'low', timestamp: Date.now() });
    orchestrator.onEvent({ type: 'gate_blocked', source: 'qa', data: {}, severity: 'critical', timestamp: Date.now() });
    orchestrator.onEvent({ type: 'improvement', source: 'dev', data: {}, severity: 'medium', timestamp: Date.now() });
    await orchestrator.processQueue();
    const stats = orchestrator.getStats();
    expect(stats.topSeverity).toBe('critical');
  });

  it('should handle events with empty queue processing', async () => {
    await orchestrator.processQueue();
    const stats = orchestrator.getStats();
    expect(stats.totalEvents).toBe(0);
    expect(stats.totalActions).toBe(0);
  });
});

describe('LoopScheduler Extended', () => {
  let scheduler: LoopScheduler;

  beforeEach(() => {
    scheduler = new LoopScheduler();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should start and stop without errors', () => {
    scheduler.start({ checkIntervalMs: 500, autoFix: true, maxActions: 5 });
    expect(scheduler.isRunning()).toBe(true);
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it('should handle restart correctly', () => {
    scheduler.start({ checkIntervalMs: 200, autoFix: false, maxActions: 3 });
    scheduler.stop();
    scheduler.start({ checkIntervalMs: 100, autoFix: true, maxActions: 10 });
    expect(scheduler.isRunning()).toBe(true);
  });

  it('should emit tick events', (done) => {
    let tickCount = 0;
    scheduler.on('tick', () => {
      tickCount++;
      if (tickCount >= 2) {
        scheduler.stop();
        done();
      }
    });
    scheduler.start({ checkIntervalMs: 10, autoFix: true, maxActions: 5 });
  });

  it('should not emit tick when stopped', (done) => {
    let tickCount = 0;
    scheduler.on('tick', () => tickCount++);
    scheduler.start({ checkIntervalMs: 10, autoFix: true, maxActions: 5 });
    setTimeout(() => {
      scheduler.stop();
      const count = tickCount;
      setTimeout(() => {
        expect(tickCount).toBe(count);
        done();
      }, 30);
    }, 30);
  });
});