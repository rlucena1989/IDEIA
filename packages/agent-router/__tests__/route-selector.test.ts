import { RouteSelector } from '../src/route-selector';

describe('RouteSelector', () => {
  const selector = new RouteSelector();

  it('returns N0 pipeline', () => {
    const p = selector.select('N0');
    expect(p.requirePlan).toBe(false);
    expect(p.requireApproval).toBe(false);
    expect(p.maxSteps).toBe(1);
  });

  it('returns N5 pipeline with all stages', () => {
    const p = selector.select('N5');
    expect(p.requirePlan).toBe(true);
    expect(p.requireVerification).toBe(true);
    expect(p.requireApproval).toBe(true);
    expect(p.parallelAgents).toBe(true);
    expect(p.requiredAgents).toContain('supervisor');
  });

  it('returns token budget', () => {
    expect(selector.getTokenBudget('N0')).toBe(500);
    expect(selector.getTokenBudget('N5')).toBe(25000);
  });

  it('returns all pipelines', () => {
    const all = selector.getAllPipelines();
    expect(Object.keys(all).length).toBe(6);
  });
});
