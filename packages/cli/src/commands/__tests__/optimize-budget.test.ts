import { handleBudgetCalculate, handleBudgetCheck } from '../optimize-budget';

describe('optimize-budget handlers', () => {
  it('handleBudgetCalculate should be defined', () => {
    expect(handleBudgetCalculate).toBeDefined();
    expect(typeof handleBudgetCalculate).toBe('function');
  });

  it('handleBudgetCheck should be defined', () => {
    expect(handleBudgetCheck).toBeDefined();
    expect(typeof handleBudgetCheck).toBe('function');
  });
});
