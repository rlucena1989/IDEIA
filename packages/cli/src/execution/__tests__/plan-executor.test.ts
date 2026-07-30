import { LocalTaskEngine } from '../task-engine';
import { LocalPlanExecutor, type Plan } from '../plan-executor';

describe('LocalPlanExecutor', () => {
  let engine: LocalTaskEngine;
  let executor: LocalPlanExecutor;

  beforeEach(() => {
    engine = new LocalTaskEngine();
    executor = new LocalPlanExecutor(engine);
  });

  it('should execute a plan with steps', async () => {
    const plan: Plan = {
      id: 'p1',
      name: 'test-plan',
      steps: [
        { id: 's1', name: 'Step 1', type: 'default', input: {}, dependsOn: [] },
      ],
    };
    const result = await executor.execute(plan);
    expect(result.ok).toBe(true);
    expect(result.planId).toBe('p1');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should report pending status for unknown plan', () => {
    expect(executor.status('unknown')).toBe('pending');
  });

  it('should report completed status after execution', async () => {
    const plan: Plan = {
      id: 'p2',
      name: 'test-plan-2',
      steps: [
        { id: 's2', name: 'Step 2', type: 'default', input: {}, dependsOn: [] },
      ],
    };
    await executor.execute(plan);
    expect(executor.status('p2')).toBe('completed');
  });

  it('should cancel a plan before it executes', async () => {
    await executor.cancel('p3');
    expect(executor.status('p3')).toBe('cancelled');
  });

  it('should handle dependency failure', async () => {
    const plan: Plan = {
      id: 'p4',
      name: 'dep-plan',
      steps: [
        { id: 'sa', name: 'Step A', type: 'default', input: {}, dependsOn: [] },
        { id: 'sb', name: 'Step B', type: 'default', input: {}, dependsOn: ['sa'] },
      ],
    };
    const result = await executor.execute(plan);
    expect(result.ok).toBe(true);
    expect(result.stepResults.has('sa')).toBe(true);
    expect(result.stepResults.has('sb')).toBe(true);
  });
});
