import { PriorityEngine, createPriorityEngine } from './priority';
import { Task} from './types';

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

describe('PriorityEngine', () => {
  let engine: PriorityEngine;

  beforeEach(() => {
    engine = createPriorityEngine();
  });

  describe('MoSCoW strategy', () => {
    it('classifies high-impact+high-urgency tasks as must', () => {
      const tasks = [makeTask({ id: 't1', impact: 1.0, urgency: 1.0, effort: 0.0 })];
      const result = engine.prioritize(tasks, 'moscow');
      expect(result[0].priority).toBe('must');
      expect(result[0].score).toBeGreaterThanOrEqual(0.8);
    });

    it('classifies medium tasks as should', () => {
      const tasks = [makeTask({ id: 't1', impact: 0.8, urgency: 0.8, effort: 0.2 })];
      const result = engine.prioritize(tasks, 'moscow');
      expect(result[0].priority).toBe('should');
    });

    it('classifies low-impact tasks as wont', () => {
      const tasks = [makeTask({ id: 't1', impact: 0.1, urgency: 0.1, effort: 0.9 })];
      const result = engine.prioritize(tasks, 'moscow');
      expect(result[0].priority).toBe('wont');
    });

    it('sorts results descending by score', () => {
      const tasks = [
        makeTask({ id: 't1', impact: 0.9, urgency: 0.9, effort: 0.1 }),
        makeTask({ id: 't2', impact: 0.2, urgency: 0.2, effort: 0.8 }),
        makeTask({ id: 't3', impact: 0.5, urgency: 0.5, effort: 0.5 }),
      ];
      const result = engine.prioritize(tasks, 'moscow');
      expect(result[0].task.id).toBe('t1');
      expect(result[2].task.id).toBe('t2');
    });
  });

  describe('Eisenhower strategy', () => {
    it('marks urgent+important as must', () => {
      const tasks = [makeTask({ id: 't1', urgency: 0.8, impact: 0.9 })];
      const result = engine.prioritize(tasks, 'eisenhower');
      expect(result[0].priority).toBe('must');
    });

    it('marks urgent-only as should', () => {
      const tasks = [makeTask({ id: 't1', urgency: 0.8, impact: 0.2 })];
      const result = engine.prioritize(tasks, 'eisenhower');
      expect(result[0].priority).toBe('should');
    });

    it('marks important-only as could', () => {
      const tasks = [makeTask({ id: 't1', urgency: 0.2, impact: 0.8 })];
      const result = engine.prioritize(tasks, 'eisenhower');
      expect(result[0].priority).toBe('could');
    });
  });

  describe('WSJF strategy', () => {
    it('gives high score to high-value low-effort tasks', () => {
      const tasks = [makeTask({ id: 't1', impact: 0.9, urgency: 0.9, effort: 0.1 })];
      const result = engine.prioritize(tasks, 'wsjf');
      expect(result[0].priority).toBe('must');
      expect(result[0].score).toBeGreaterThan(2);
    });

    it('gives low score to low-value high-effort tasks', () => {
      const tasks = [makeTask({ id: 't1', impact: 0.1, urgency: 0.1, effort: 0.9 })];
      const result = engine.prioritize(tasks, 'wsjf');
      expect(result[0].priority).toBe('wont');
    });
  });

  describe('Risk-Adjusted strategy', () => {
    it('includes riskScore in the calculation', () => {
      const lowRisk = makeTask({ id: 't1', riskScore: 0.1, impact: 0.8, urgency: 0.8, effort: 0.2 });
      const highRisk = makeTask({ id: 't2', riskScore: 0.9, impact: 0.8, urgency: 0.8, effort: 0.2 });
      const result = engine.prioritize([lowRisk, highRisk], 'risk-adjusted');
      expect(result[0].task.id).toBe('t2');
    });
  });

  it('defaults to moscow when strategy is unknown', () => {
    const tasks = [makeTask()];
    const result = engine.prioritize(tasks, 'unknown' as never);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('priority');
  });

  it('returns rationale for every prioritized task', () => {
    const tasks = [makeTask()];
    for (const s of ['moscow', 'eisenhower', 'wsjf', 'risk-adjusted'] as const) {
      const result = engine.prioritize(tasks, s);
      expect(result[0].rationale).toBeTruthy();
    }
  });

  it('creates engine via factory function', () => {
    expect(createPriorityEngine()).toBeInstanceOf(PriorityEngine);
  });
});
