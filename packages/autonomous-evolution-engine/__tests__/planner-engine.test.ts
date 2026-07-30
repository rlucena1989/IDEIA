import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PlannerEngine } from '../src/planner-engine';
import type { PrioritizedRecommendation } from '../src/types';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
  Logger: jest.fn(),
}));

function mockLogger(): any {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

describe('PlannerEngine', () => {
  let planner: PlannerEngine;

  beforeEach(() => {
    planner = new PlannerEngine(mockLogger());
  });

  it('creates plan from recommendations', () => {
    const recs: PrioritizedRecommendation[] = [
      { action: 'Upgrade dependencies', confidence: 0.8, priority: 1, effort: 'hours', category: 'version', rationale: 'Outdated' },
      { action: 'Add tests', confidence: 0.9, priority: 2, effort: 'days', category: 'test', rationale: 'Low coverage' },
    ];

    const plan = planner.createPlan(recs);
    expect(plan.id).toContain('plan-');
    expect(plan.steps.length).toBe(2);
    expect(plan.totalEffortMs).toBeGreaterThan(0);
    expect(plan.riskScore).toBeGreaterThan(0);
  });

  it('limits to top 10 recommendations', () => {
    const recs: PrioritizedRecommendation[] = Array.from({ length: 15 }, (_, i) => ({
      action: `Action ${i}`,
      confidence: 0.5,
      priority: i + 1,
      effort: 'minutes',
      category: 'health',
      rationale: 'test',
    }));

    const plan = planner.createPlan(recs);
    expect(plan.steps.length).toBe(10);
  });

  it('estimateEffort converts ms to time units', () => {
    const recs: PrioritizedRecommendation[] = [
      { action: 'Quick fix', confidence: 0.7, priority: 1, effort: 'minutes', category: 'lint', rationale: 'minor' },
    ];

    const plan = planner.createPlan(recs);
    const effort = planner.estimateEffort(plan);
    expect(effort.minutes).toBeGreaterThanOrEqual(1);
    expect(effort.hours).toBeGreaterThanOrEqual(0);
    expect(effort.days).toBeGreaterThanOrEqual(0);
  });

  it('getRiskScore returns 0 for empty steps', () => {
    expect(planner['getRiskScore']([])).toBe(0);
  });

  it('getRiskScore increases with more steps and higher risks', () => {
    const steps = [
      { id: '1', description: 'a', action: 'a', target: 't', estimatedMs: 1000, risk: 'low' as const },
      { id: '2', description: 'b', action: 'b', target: 't', estimatedMs: 1000, risk: 'high' as const },
    ];

    const score = planner['getRiskScore'](steps);
    expect(score).toBeGreaterThan(0.2);
    expect(score).toBeLessThanOrEqual(1);
  });
});
