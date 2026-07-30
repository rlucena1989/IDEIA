import { createSafetyUseCase } from '../safety-use-case';

describe('SafetyUseCase', () => {
  const useCase = createSafetyUseCase();

  beforeEach(() => {
    // Clear all rules by removing each default rule
    const rules = useCase.listRules();
    for (const rule of rules.data ?? []) {
      useCase.removeRule(rule.id);
    }
  });

  it('addRule creates rule with defaults', () => {
    const result = useCase.addRule('Test rule', 'A test', 'test.*pattern', 'block', 'high');
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.name).toBe('Test rule');
    expect(result.data!.action).toBe('block');
    expect(result.data!.severity).toBe('high');
    expect(result.data!.enabled).toBe(true);
    expect(result.data!.id).toMatch(/^safety_/);
  });

  it('checkInput detects blocked patterns', () => {
    useCase.addRule('Block test', 'blocks X', 'X+', 'block', 'high');
    const result = useCase.checkInput('some XXX here');
    expect(result.ok).toBe(true);
    expect(result.data!.blocked).toBeGreaterThanOrEqual(1);
  });

  it('toggleRule enables/disables', () => {
    const added = useCase.addRule('Toggle me', 'test rule', 'pattern', 'warn', 'low');
    const id = added.data!.id;

    const disabled = useCase.toggleRule(id, false);
    expect(disabled.ok).toBe(true);
    expect(disabled.data!.enabled).toBe(false);

    const enabled = useCase.toggleRule(id, true);
    expect(enabled.data!.enabled).toBe(true);
  });

  it('listRules returns all rules', () => {
    useCase.addRule('Rule A', 'desc', 'a', 'warn', 'low');
    useCase.addRule('Rule B', 'desc', 'b', 'block', 'medium');
    const result = useCase.listRules();
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});
