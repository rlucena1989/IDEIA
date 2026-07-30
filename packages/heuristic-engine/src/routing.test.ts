import { RoutingEngine, createRoutingEngine } from './routing';
import { Task, Agent } from './types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    type: 'feature',
    name: 'test task',
    description: 'a test task',
    riskScore: 0.3,
    urgency: 0.5,
    impact: 0.7,
    effort: 0.4,
    dependencies: 1,
    files: ['a.ts'],
    integrations: [],
    ambiguityLevel: 0.2,
    requiresADR: false,
    ...overrides,
  };
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    name: 'agent-1',
    capabilities: ['feature', 'refactor'],
    currentLoad: 2,
    maxLoad: 10,
    taskHistory: [],
    ...overrides,
  };
}

describe('RoutingEngine', () => {
  let engine: RoutingEngine;

  beforeEach(() => {
    engine = createRoutingEngine();
  });

  describe('classifyComplexity', () => {
    it('returns trivial for low-score tasks', () => {
      const task = makeTask({ files: ['a.ts'], dependencies: 0, riskScore: 0.1, ambiguityLevel: 0.1 });
      expect(engine.classifyComplexity(task)).toBe('trivial');
    });

    it('returns critical when risk > 0.7 and requiresADR', () => {
      const task = makeTask({ riskScore: 0.8, requiresADR: true, files: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'], dependencies: 5, ambiguityLevel: 0.6, integrations: ['ext'] });
      expect(engine.classifyComplexity(task)).toBe('critical');
    });

    it('returns complex for high ambiguity + many deps', () => {
      const task = makeTask({ dependencies: 4, riskScore: 0.5, ambiguityLevel: 0.6, files: Array(6).fill('x') });
      expect(engine.classifyComplexity(task)).toBe('complex');
    });

    it('returns moderate for medium scores', () => {
      const task = makeTask({ dependencies: 2, riskScore: 0.5, ambiguityLevel: 0.6, files: Array(6).fill('x'), integrations: [] });
      expect(engine.classifyComplexity(task)).toBe('moderate');
    });
  });

  describe('selectPipeline', () => {
    it('maps trivial to rule-only pipeline', () => {
      const route = engine.selectPipeline('trivial');
      expect(route.pipeline).toBe('rule-only');
      expect(route.expectedTokens).toBe(0);
    });

    it('maps critical to multi-agent-review pipeline', () => {
      const route = engine.selectPipeline('critical');
      expect(route.pipeline).toBe('multi-agent-review');
      expect(route.agents).toBe(5);
    });

    it('returns a new object each call', () => {
      const a = engine.selectPipeline('simple');
      const b = engine.selectPipeline('simple');
      expect(a).not.toBe(b);
    });
  });

  describe('selectAgent', () => {
    it('returns the agent with highest composite score', () => {
      const task = makeTask({ type: 'feature' });
      const agents = [
        makeAgent({ id: 'a1', capabilities: ['feature'], currentLoad: 0, maxLoad: 10, taskHistory: [{ type: 'feature', success: true }] }),
        makeAgent({ id: 'a2', capabilities: ['feature'], currentLoad: 9, maxLoad: 10, taskHistory: [{ type: 'feature', success: false }] }),
      ];
      const selected = engine.selectAgent(task, agents);
      expect(selected?.id).toBe('a1');
    });

    it('returns null when no agent has the capability', () => {
      const task = makeTask({ type: 'security-audit' });
      const agents = [makeAgent({ capabilities: ['feature'] })];
      expect(engine.selectAgent(task, agents)).toBeNull();
    });

    it('skips agents at max load', () => {
      const task = makeTask({ type: 'feature' });
      const agents = [makeAgent({ id: 'a1', capabilities: ['feature'], currentLoad: 10, maxLoad: 10 })];
      expect(engine.selectAgent(task, agents)).toBeNull();
    });

    it('favors agents with successful history on same task type', () => {
      const task = makeTask({ type: 'bugfix' });
      const agents = [
        makeAgent({ id: 'a1', capabilities: ['bugfix'], taskHistory: [{ type: 'bugfix', success: true }, { type: 'bugfix', success: true }] }),
        makeAgent({ id: 'a2', capabilities: ['bugfix'], taskHistory: [{ type: 'bugfix', success: false }, { type: 'bugfix', success: false }] }),
      ];
      const selected = engine.selectAgent(task, agents);
      expect(selected?.id).toBe('a1');
    });

    it('returns null for empty agent list', () => {
      expect(engine.selectAgent(makeTask(), [])).toBeNull();
    });
  });

  it('creates engine via factory function', () => {
    expect(createRoutingEngine()).toBeInstanceOf(RoutingEngine);
  });
});
