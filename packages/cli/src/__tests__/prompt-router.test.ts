import { routePrompt, selectOutputMode, getOutputBudget, getMaxInputTokens, getMaxOutputTokens, formatOutputBudget } from '../runtime/prompt-router';
import { TaskType } from '../runtime/classifier';

describe('prompt-router', () => {
  it('routePrompt routes bugfix to bugfix template', () => {
    const route = routePrompt('bugfix');
    expect(route.template).toBe('bugfix');
    expect(route.outputMode).toBe('standard');
  });

  it('routePrompt accepts explicit mode', () => {
    const route = routePrompt('feature', 'compact');
    expect(route.outputMode).toBe('compact');
    expect(route.contextStrategy).toBe('minimal_context');
  });

  it('selectOutputMode returns compact for high confidence bugfix', () => {
    expect(selectOutputMode('bugfix', 90)).toBe('compact');
  });

  it('selectOutputMode uses budget override', () => {
    expect(selectOutputMode('feature', 80, 3000)).toBe('compact');
    expect(selectOutputMode('feature', 80, 100000)).toBe('forensic');
  });

  it('getOutputBudget returns budget by mode', () => {
    const budget = getOutputBudget('compact');
    expect(budget.maxTokens).toBe(500);
    expect(budget.includeExplanations).toBe(false);
  });

  it('getMaxInputTokens returns correct limits', () => {
    expect(getMaxInputTokens('compact')).toBe(4000);
    expect(getMaxInputTokens('standard')).toBe(16000);
    expect(getMaxInputTokens('expanded')).toBe(32000);
    expect(getMaxInputTokens('forensic')).toBe(64000);
  });

  it('getMaxOutputTokens returns correct limits', () => {
    expect(getMaxOutputTokens('compact')).toBe(500);
    expect(getMaxOutputTokens('standard')).toBe(2000);
    expect(getMaxOutputTokens('expanded')).toBe(8000);
    expect(getMaxOutputTokens('forensic')).toBe(16000);
  });

  it('formatOutputBudget produces readable output', () => {
    const str = formatOutputBudget(getOutputBudget('standard'));
    expect(str).toContain('Mode: standard');
    expect(str).toContain('Code: yes');
  });
});
