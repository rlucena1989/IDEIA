import { PromptEconomy, createPromptEconomy } from '../src/index';

describe('PromptEconomy (integration)', () => {
  const economy = createPromptEconomy();

  it('estimates cost for a feature task', async () => {
    const cost = await economy.estimateCost('feature', 'N3');
    expect(cost.maxTokens).toBeGreaterThan(0);
    expect(cost.estimatedTokens).toBeGreaterThan(0);
    expect(cost.pipelineStages.length).toBeGreaterThan(0);
  });

  it('routes features to different pipelines than questions', async () => {
    const featureCost = await economy.estimateCost('feature', 'N2');
    const questionCost = await economy.estimateCost('question', 'N0');
    expect(featureCost.estimatedTokens).toBeGreaterThan(questionCost.estimatedTokens);
  });

  it('tracks budget end-to-end', () => {
    const budget = economy.budgetManager.getBudget('bugfix', 'N2');
    economy.budgetTracker.allocate('integration-test', budget);

    economy.budgetTracker.spend('integration-test', 500, 'planning');
    economy.budgetTracker.spend('integration-test', 800, 'execution');

    const report = economy.budgetTracker.getUsageReport('integration-test');
    expect(report).not.toBeNull();
    expect(report!.spent).toBe(1300);
    expect(report!.remaining).toBe(budget.maxTokens - 1300);
  });

  it('compresses context', async () => {
    const result = await economy.compressor.compress({
      messages: [
        { role: 'user', content: 'Create auth system', id: '1' },
        { role: 'assistant', content: 'OK', id: '2' },
      ],
      contextItems: [],
      maxTokens: 4000,
      strategy: 'full',
    });
    expect(result.originalTokens).toBeGreaterThan(0);
    expect(Array.isArray(result.messages)).toBe(true);
  });

  it('uses cache', () => {
    economy.cache.set('test-plan', { steps: ['a', 'b'] });
    const hit = economy.cache.get('test-plan');
    expect(hit.found).toBe(true);
  });
});
