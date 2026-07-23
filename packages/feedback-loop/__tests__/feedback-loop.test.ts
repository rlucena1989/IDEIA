import { FeedbackOrchestrator } from '../src/orchestrator';
import { LoopScheduler } from '../src/scheduler';

describe('FeedbackOrchestrator', () => {
  let orchestrator: FeedbackOrchestrator;

  beforeEach(() => {
    orchestrator = new FeedbackOrchestrator();
  });

  it('should process an event and return an action', async () => {
    const action = await orchestrator.onEvent({
      type: 'test_failure',
      source: 'ci-runner',
      data: { test: 'login.test.ts', exitCode: 1 },
      severity: 'high',
      timestamp: Date.now(),
    });
    expect(action).toBeDefined();
    expect(action.eventId).toBeTruthy();
    expect(['pending', 'running', 'completed', 'failed']).toContain(action.status);
    expect(action.type).toBe('fix');
  });

  it('should escalate critical events', async () => {
    const action = await orchestrator.onEvent({
      type: 'gate_blocked',
      source: 'quality-gate',
      data: { gate: 'security', reason: 'critical vuln' },
      severity: 'critical',
      timestamp: Date.now(),
    });
    expect(action.type).toBe('escalate');
  });

  it('should log pattern detected events', async () => {
    const action = await orchestrator.onEvent({
      type: 'pattern_detected',
      source: 'pattern-learner',
      data: { pattern: 'memory-leak', confidence: 0.85 },
      severity: 'low',
      timestamp: Date.now(),
    });
    expect(action.type).toBe('log');
  });

  it('should register and find patterns', () => {
    const id = orchestrator.registerPattern({
      pattern: 'timeout on login',
      symptom: 'auth service slow response',
      fix: 'increase pool size and add timeout',
      frequency: 5,
      lastDetected: Date.now(),
      confidence: 0.8,
    });
    expect(id).toBeTruthy();

    const found = orchestrator.findPatterns('auth');
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found[0].pattern).toContain('timeout');
  });

  it('should find patterns by symptom', () => {
    orchestrator.registerPattern({
      pattern: 'OOM crash',
      symptom: 'process exited with OOM',
      fix: 'increase memory limit',
      frequency: 3,
      lastDetected: Date.now(),
      confidence: 0.9,
    });
    const found = orchestrator.findPatterns('OOM');
    expect(found).toHaveLength(1);
  });

  it('should return empty array for unknown pattern', () => {
    const found = orchestrator.findPatterns('nonexistent');
    expect(found).toHaveLength(0);
  });

  it('should return correct stats', async () => {
    await orchestrator.onEvent({
      type: 'metric_degraded', source: 'perf', data: { metric: 'latency' }, severity: 'medium', timestamp: Date.now(),
    });
    await orchestrator.onEvent({
      type: 'improvement', source: 'system', data: { suggestion: 'refactor' }, severity: 'low', timestamp: Date.now(),
    });
    orchestrator.registerPattern({
      pattern: 'slow query', symptom: 'db slow', fix: 'add index', frequency: 2, lastDetected: Date.now(), confidence: 0.7,
    });

    const stats = orchestrator.getStats();
    expect(stats.totalEvents).toBe(2);
    expect(stats.totalActions).toBe(2);
    expect(stats.patternsCount).toBe(1);
    expect(stats.topSeverity).toBe('medium');
  });

  it('should process the event queue', async () => {
    await orchestrator.onEvent({
      type: 'test_failure', source: 'unit', data: {}, severity: 'low', timestamp: Date.now(),
    });
    await orchestrator.processQueue();
    const stats = orchestrator.getStats();
    expect(stats.totalEvents).toBe(1);
    expect(stats.totalActions).toBe(1);
  });
});

describe('LoopScheduler', () => {
  let scheduler: LoopScheduler;

  beforeEach(() => {
    scheduler = new LoopScheduler();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should start and emit tick events', (done) => {
    scheduler.once('tick', (timestamp: number) => {
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
      done();
    });
    scheduler.start({ checkIntervalMs: 10, autoFix: true, maxActions: 5 });
  });

  it('should report running state', () => {
    expect(scheduler.isRunning()).toBe(false);
    scheduler.start({ checkIntervalMs: 1000, autoFix: false, maxActions: 3 });
    expect(scheduler.isRunning()).toBe(true);
  });

  it('should stop and clear the interval', () => {
    scheduler.start({ checkIntervalMs: 1000, autoFix: false, maxActions: 3 });
    expect(scheduler.isRunning()).toBe(true);
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it('should restart without error', () => {
    scheduler.start({ checkIntervalMs: 100, autoFix: true, maxActions: 10 });
    scheduler.start({ checkIntervalMs: 200, autoFix: false, maxActions: 5 });
    expect(scheduler.isRunning()).toBe(true);
  });
});
