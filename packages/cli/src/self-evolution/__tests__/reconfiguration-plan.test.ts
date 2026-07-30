import { buildReconfigurationPlan } from '../reconfiguration-plan';
import type { EvolutionChange } from '../evolution-types';

describe('buildReconfigurationPlan', () => {
  it('builds a plan from changes', () => {
    const changes: EvolutionChange[] = [
      { changeId: 'c1', type: 'enable', target: 'feature-x', to: true, reason: 'Ready' },
    ];
    const plan = buildReconfigurationPlan(changes);
    expect(plan.planId).toMatch(/^plan-/);
    expect(plan.changes).toHaveLength(1);
    expect(plan.rollbackAvailable).toBe(true);
  });

  it('requires approval for migrate type changes', () => {
    const changes: EvolutionChange[] = [
      { changeId: 'c1', type: 'migrate', target: 'db', from: 'sqlite', to: 'postgres', reason: 'Scale' },
    ];
    const plan = buildReconfigurationPlan(changes);
    expect(plan.requiresApproval).toBe(true);
  });

  it('requires approval for replace type changes', () => {
    const changes: EvolutionChange[] = [
      { changeId: 'c1', type: 'replace', target: 'engine', from: 'A', to: 'B', reason: 'Upgrade' },
    ];
    const plan = buildReconfigurationPlan(changes);
    expect(plan.requiresApproval).toBe(true);
  });

  it('does not require approval for enable/disable/tune changes', () => {
    const changes: EvolutionChange[] = [
      { changeId: 'c1', type: 'enable', target: 'x', to: true, reason: 'R' },
      { changeId: 'c2', type: 'disable', target: 'y', from: true, to: false, reason: 'R' },
      { changeId: 'c3', type: 'tune', target: 'z', from: 1, to: 2, reason: 'R' },
    ];
    const plan = buildReconfigurationPlan(changes);
    expect(plan.requiresApproval).toBe(false);
  });

  it('handles empty changes array', () => {
    const plan = buildReconfigurationPlan([]);
    expect(plan.changes).toHaveLength(0);
    expect(plan.requiresApproval).toBe(false);
  });

  it('sets createdAt with valid ISO date', () => {
    const plan = buildReconfigurationPlan([]);
    expect(new Date(plan.createdAt).toISOString()).toBe(plan.createdAt);
  });
});
