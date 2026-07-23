import { PlanningEngine, createPlanningEngine } from '../src/index';

describe('PlanningEngine (integration)', () => {
  const engine = createPlanningEngine({ environment: 'dev' });

  it('creates a full plan with all analysis enabled', () => {
    const plan = engine.createPlan('Implementar autenticação JWT com refresh token para o módulo de usuários');

    expect(plan.id).toBeTruthy();
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.status).toBe('draft');
    expect(plan.totalCost.estimatedTokens).toBeGreaterThan(0);
    expect(plan.totalCost.estimatedSteps).toBe(plan.steps.length);
    expect(plan.createdAt).toBeTruthy();
  });

  it('each step has risk, cost, and criteria', () => {
    const plan = engine.createPlan('Corrigir bug no checkout que duplica pedidos');
    for (const step of plan.steps) {
      expect(step.risk.level).toBeDefined();
      expect(step.cost.estimatedTokens).toBeGreaterThan(0);
      expect(step.acceptanceCriteria.length).toBeGreaterThan(0);
    }
  });

  it('update step status changes plan status', () => {
    const plan = engine.createPlan('Tarefa simples');
    const firstStep = plan.steps[0];

    const updated = engine.updateStepStatus(plan.id, firstStep.id, 'completed');
    expect(updated.steps[0].status).toBe('completed');
  });

  it('replans after failure', () => {
    const plan = engine.createPlan('Tarefa com fallback');
    const firstStep = plan.steps[0];

    engine.updateStepStatus(plan.id, firstStep.id, 'failed');
    const replanned = engine.replan(plan.id, firstStep.id);

    expect(replanned.status).toBe('draft');
    expect(replanned.steps.length).toBeGreaterThanOrEqual(1);
  });

  it('lists plans by status', () => {
    engine.createPlan('Plan para listar');
    const drafts = engine.listPlans('draft');
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.every(p => p.status === 'draft')).toBe(true);
  });

  it('supports different decomposition strategies', () => {
    const td = engine.createPlan('Feature complexa com várias etapas', 'top_down');
    const bu = engine.createPlan('Feature complexa com várias etapas', 'bottom_up');
    expect(td.strategy).toBe('top_down');
    expect(bu.strategy).toBe('bottom_up');
  });
});
