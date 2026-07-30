import { describe, it, expect, beforeEach } from '@jest/globals';
import { FeedbackCollector } from '../feedback-collector';
import type { FeedbackEvent } from '../feedback-collector';
import { LearningEngine } from '../learning-engine';
import { PatternLearner } from '../pattern-learner';


function makeEvent(overrides: Partial<FeedbackEvent> = {}): FeedbackEvent {
  return {
    id: 'evt-1',
    type: 'success',
    source: 'user',
    agentId: 'agent-1',
    taskId: 'task-1',
    action: 'deploy',
    result: 'ok',
    score: 85,
    latencyMs: 1200,
    context: { env: 'prod' },
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('FeedbackCollector', () => {
  let collector: FeedbackCollector;

  beforeEach(() => {
    collector = new FeedbackCollector();
  });

  it('record stores event', () => {
    const event = makeEvent();
    collector.record(event);
    expect(collector.getEvents()).toHaveLength(1);
    expect(collector.getEvents()[0].id).toBe('evt-1');
  });

  it('getByAgent filters correctly', () => {
    collector.record(makeEvent({ agentId: 'agent-1', id: 'e1' }));
    collector.record(makeEvent({ agentId: 'agent-2', id: 'e2' }));
    collector.record(makeEvent({ agentId: 'agent-1', id: 'e3' }));
    const result = collector.getByAgent('agent-1');
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['e1', 'e3']);
  });

  it('getByType filters correctly', () => {
    collector.record(makeEvent({ type: 'success', id: 'e1' }));
    collector.record(makeEvent({ type: 'failure', id: 'e2' }));
    collector.record(makeEvent({ type: 'success', id: 'e3' }));
    const result = collector.getByType('success');
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['e1', 'e3']);
  });

  it('getBySource filters correctly', () => {
    collector.record(makeEvent({ source: 'user', id: 'e1' }));
    collector.record(makeEvent({ source: 'system', id: 'e2' }));
    collector.record(makeEvent({ source: 'user', id: 'e3' }));
    const result = collector.getBySource('user');
    expect(result).toHaveLength(2);
  });

  it('getRecent returns last N events', () => {
    for (let i = 0; i < 10; i++) {
      collector.record(makeEvent({ id: `e${i}` }));
    }
    const recent = collector.getRecent(3);
    expect(recent).toHaveLength(3);
    expect(recent[0].id).toBe('e7');
    expect(recent[2].id).toBe('e9');
  });

  it('getStats returns aggregate data', () => {
    collector.record(makeEvent({ type: 'success', score: 90, latencyMs: 100, agentId: 'a1' }));
    collector.record(makeEvent({ type: 'failure', score: 30, latencyMs: 500, agentId: 'a1' }));
    collector.record(makeEvent({ type: 'success', score: 80, latencyMs: 200, agentId: 'a2' }));
    const stats = collector.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byType.success).toBe(2);
    expect(stats.byType.failure).toBe(1);
    expect(stats.byAgent.a1).toBe(2);
    expect(stats.byAgent.a2).toBe(1);
    expect(stats.avgScore).toBeCloseTo(66.67, 1);
    expect(stats.avgLatency).toBeCloseTo(266.67, 1);
  });

  it('maxSize enforcement', () => {
    const small = new FeedbackCollector(3);
    for (let i = 0; i < 10; i++) {
      small.record(makeEvent({ id: `e${i}` }));
    }
    expect(small.getEvents()).toHaveLength(3);
    expect(small.getEvents()[0].id).toBe('e7');
  });

  it('clear removes all events', () => {
    collector.record(makeEvent());
    collector.clear();
    expect(collector.getEvents()).toHaveLength(0);
  });

  it('getStats with no events returns zeros', () => {
    const stats = collector.getStats();
    expect(stats.total).toBe(0);
    expect(stats.avgScore).toBe(0);
    expect(stats.avgLatency).toBe(0);
  });
});

describe('LearningEngine', () => {
  let collector: FeedbackCollector;
  let engine: LearningEngine;

  beforeEach(() => {
    collector = new FeedbackCollector();
    engine = new LearningEngine(collector);
  });

  it('learn processes events and creates records', () => {
    collector.record(makeEvent({ action: 'deploy', type: 'success', score: 90, latencyMs: 100 }));
    collector.record(makeEvent({ action: 'deploy', type: 'success', score: 80, latencyMs: 200 }));
    engine.learn();
    const insights = engine.getInsights();
    expect(insights).toHaveLength(1);
    expect(insights[0].action).toBe('deploy');
    expect(insights[0].successRate).toBe(100);
  });

  it('getInsights returns insights with correct trend', () => {
    collector.record(makeEvent({ action: 'test', type: 'success', score: 90, latencyMs: 100 }));
    collector.record(makeEvent({ action: 'test', type: 'failure', score: 20, latencyMs: 500 }));
    collector.record(makeEvent({ action: 'test', type: 'success', score: 95, latencyMs: 50 }));
    engine.learn();
    const insights = engine.getInsights();
    expect(insights.length).toBeGreaterThanOrEqual(1);
    const testInsight = insights.find(i => i.action === 'test');
    expect(testInsight).toBeDefined();
    expect(testInsight!.successRate).toBeCloseTo(66.67, 1);
    expect(['improving', 'declining', 'stable']).toContain(testInsight!.trend);
  });

  it('getSuccessRate calculation', () => {
    collector.record(makeEvent({ action: 'build', type: 'success', score: 90, latencyMs: 100 }));
    collector.record(makeEvent({ action: 'build', type: 'failure', score: 30, latencyMs: 400 }));
    collector.record(makeEvent({ action: 'build', type: 'success', score: 85, latencyMs: 150 }));
    engine.learn();
    const rate = engine.getSuccessRate('build');
    expect(rate).toBeCloseTo(66.67, 1);
  });

  it('getSuccessRate with no data returns 0', () => {
    expect(engine.getSuccessRate('unknown')).toBe(0);
  });

  it('getTrends returns trend data', () => {
    collector.record(makeEvent({ action: 'lint', type: 'success', score: 90, latencyMs: 100 }));
    collector.record(makeEvent({ action: 'lint', type: 'success', score: 95, latencyMs: 80 }));
    engine.learn();
    const trends = engine.getTrends();
    expect(trends.has('lint')).toBe(true);
  });

  it('getRecommendation returns suggestion', () => {
    collector.record(makeEvent({ action: 'publish', type: 'success', score: 95, latencyMs: 100 }));
    collector.record(makeEvent({ action: 'publish', type: 'success', score: 90, latencyMs: 120 }));
    collector.record(makeEvent({ action: 'publish', type: 'success', score: 92, latencyMs: 110 }));
    engine.learn();
    const rec = engine.getRecommendation('publish', '{"env":"prod"}');
    expect(typeof rec).toBe('string');
    expect(rec.length).toBeGreaterThan(0);
  });

  it('getRecommendation with no data returns fallback', () => {
    const rec = engine.getRecommendation('unknown', '{}');
    expect(rec).toContain('No data available');
  });

  it('learn with no events is empty', () => {
    engine.learn();
    expect(engine.getInsights()).toHaveLength(0);
  });
});

describe('PatternLearner', () => {
  let learner: PatternLearner;

  beforeEach(() => {
    learner = new PatternLearner(5);
  });

  it('observe detects patterns', () => {
    const events: FeedbackEvent[] = [
      makeEvent({ agentId: 'a1', action: 'build', type: 'failure', latencyMs: 100 }),
      makeEvent({ agentId: 'a1', action: 'test', type: 'failure', latencyMs: 200 }),
      makeEvent({ agentId: 'a1', action: 'build', type: 'failure', latencyMs: 150 }),
      makeEvent({ agentId: 'a1', action: 'test', type: 'failure', latencyMs: 250 }),
    ];
    learner.observe(events);
    expect(learner.getPatterns().length).toBeGreaterThanOrEqual(1);
  });

  it('getPatterns returns patterns', () => {
    expect(learner.getPatterns()).toEqual([]);
    const events = [
      makeEvent({ agentId: 'a1', action: 'build', type: 'failure' }),
      makeEvent({ agentId: 'a1', action: 'test', type: 'failure' }),
    ];
    learner.observe(events);
    expect(learner.getPatterns().length).toBeGreaterThan(0);
  });

  it('detectSequence finds matching pattern', () => {
    const events = [
      makeEvent({ agentId: 'a1', action: 'compile', type: 'failure' }),
      makeEvent({ agentId: 'a1', action: 'deploy', type: 'failure' }),
    ];
    learner.observe(events);
    const found = learner.detectSequence(['compile', 'deploy']);
    expect(found).not.toBeNull();
    expect(found!.actions).toContain('compile');
  });

  it('detectSequence returns null for unknown sequence', () => {
    expect(learner.detectSequence(['unknown'])).toBeNull();
  });

  it('getPattern returns pattern by id', () => {
    const events = [
      makeEvent({ agentId: 'a1', action: 'build', type: 'failure' }),
      makeEvent({ agentId: 'a1', action: 'test', type: 'failure' }),
    ];
    learner.observe(events);
    const patterns = learner.getPatterns();
    if (patterns.length > 0) {
      const found = learner.getPattern(patterns[0].id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(patterns[0].id);
    }
  });

  it('getRecommendations returns recommendations', () => {
    const events = [
      makeEvent({ agentId: 'a1', action: 'bad-deploy', type: 'failure' }),
      makeEvent({ agentId: 'a1', action: 'bad-deploy', type: 'timeout' }),
    ];
    learner.observe(events);
    const recs = learner.getRecommendations('a1');
    expect(recs).toHaveProperty('avoid');
    expect(recs).toHaveProperty('prefer');
  });

  it('getRecommendations returns empty for no patterns', () => {
    const recs = learner.getRecommendations('unknown');
    expect(recs.avoid).toEqual([]);
    expect(recs.prefer).toEqual([]);
  });

  it('observes empty events gracefully', () => {
    learner.observe([]);
    expect(learner.getPatterns()).toHaveLength(0);
  });

  it('detects timeout patterns', () => {
    const events = [
      makeEvent({ agentId: 'a1', action: 'heavy-task', type: 'timeout', latencyMs: 15000 }),
      makeEvent({ agentId: 'a1', action: 'heavy-task', type: 'timeout', latencyMs: 20000 }),
    ];
    learner.observe(events);
    const timeoutPatterns = learner.getPatterns().filter(p => p.type === 'timeout-pattern');
    expect(timeoutPatterns.length).toBeGreaterThanOrEqual(1);
  });
});
