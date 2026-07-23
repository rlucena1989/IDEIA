import { createPlan } from '../acceleration/planner';
import { analyzePrecision } from '../acceleration/precision';
import { predictProjectLoad } from '../acceleration/predictor';

describe('acceleration - planner', () => {
  it('deve gerar jobs para modo fast (max 3)', () => {
    const forecast = { estimatedJobs: 10, estimatedDurationMs: 7000, risk: 'low' as const };
    const precision = { confidence: 0.9, variance: 0.1, stable: true };
    const plan = createPlan('fast', forecast, precision);
    expect(plan.length).toBeLessThanOrEqual(3);
    expect(plan.length).toBeGreaterThanOrEqual(1);
  });

  it('deve gerar jobs para modo balanced (max 6)', () => {
    const forecast = { estimatedJobs: 10, estimatedDurationMs: 7000, risk: 'low' as const };
    const precision = { confidence: 0.9, variance: 0.1, stable: true };
    const plan = createPlan('balanced', forecast, precision);
    expect(plan.length).toBeLessThanOrEqual(6);
    expect(plan.length).toBeGreaterThanOrEqual(1);
  });

  it('deve gerar jobs para modo deep (max 10)', () => {
    const forecast = { estimatedJobs: 20, estimatedDurationMs: 14000, risk: 'high' as const };
    const precision = { confidence: 0.9, variance: 0.1, stable: true };
    const plan = createPlan('deep', forecast, precision);
    expect(plan.length).toBeLessThanOrEqual(10);
    expect(plan.length).toBeGreaterThanOrEqual(1);
  });

  it('cada job deve ter id, name, command, priority, dependsOn, tags', () => {
    const forecast = { estimatedJobs: 5, estimatedDurationMs: 3500, risk: 'medium' as const };
    const precision = { confidence: 0.9, variance: 0.1, stable: true };
    const plan = createPlan('balanced', forecast, precision);
    for (const job of plan) {
      expect(job.id).toBeTruthy();
      expect(job.name).toBeTruthy();
      expect(job.command).toBeTruthy();
      expect(typeof job.priority).toBe('number');
      expect(Array.isArray(job.dependsOn)).toBe(true);
      expect(Array.isArray(job.tags)).toBe(true);
    }
  });

  it('jobs com risco alto devem ter tag high-risk', () => {
    const forecast = { estimatedJobs: 5, estimatedDurationMs: 3500, risk: 'high' as const };
    const precision = { confidence: 0.9, variance: 0.1, stable: true };
    const plan = createPlan('balanced', forecast, precision);
    for (const job of plan) {
      expect(job.tags).toContain('high-risk');
    }
  });

  it('primeiro job deve ter tag bootstrap', () => {
    const forecast = { estimatedJobs: 5, estimatedDurationMs: 3500, risk: 'low' as const };
    const precision = { confidence: 0.9, variance: 0.1, stable: true };
    const plan = createPlan('balanced', forecast, precision);
    expect(plan[0].tags).toContain('bootstrap');
  });

  it('ultimo job deve ter tag finalize', () => {
    const forecast = { estimatedJobs: 5, estimatedDurationMs: 3500, risk: 'low' as const };
    const precision = { confidence: 0.9, variance: 0.1, stable: true };
    const plan = createPlan('balanced', forecast, precision);
    expect(plan[plan.length - 1].tags).toContain('finalize');
  });

  it('deve gerar planos com precision instavel e guarded', () => {
    const forecast = { estimatedJobs: 5, estimatedDurationMs: 3500, risk: 'low' as const };
    const precision = { confidence: 0.5, variance: 0.4, stable: false };
    const plan = createPlan('balanced', forecast, precision);
    // Jobs after first should have guarded tag
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].tags).toContain('guarded');
    }
  });
});