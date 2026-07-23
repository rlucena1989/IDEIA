import { AdaptiveDecomposer } from '../src/decomposer';

describe('AdaptiveDecomposer', () => {
  const decomposer = new AdaptiveDecomposer({ maxSteps: 10 });

  it('decomposes top-down for feature goals', () => {
    const { steps } = decomposer.decompose('Implementar autenticação JWT com refresh token', 'top_down');
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.some(s => s.agentRole === 'architect' || s.agentRole === 'programmer')).toBe(true);
    expect(steps.every(s => s.id.startsWith('step_'))).toBe(true);
  });

  it('decomposes bottom-up for task goals', () => {
    const { steps } = decomposer.decompose('Corrigir bug no checkout. Adicionar validação de CPF', 'bottom_up');
    expect(steps.length).toBeGreaterThanOrEqual(2);
  });

  it('decomposes hybrid strategy', () => {
    const { steps, strategy } = decomposer.decompose('Criar sistema de login com recuperação de senha', 'hybrid');
    expect(strategy).toBe('hybrid');
    expect(steps.length).toBeGreaterThan(0);
  });

  it('creates steps with acceptance criteria', () => {
    const { steps } = decomposer.decompose('Adicionar testes ao módulo de pagamento');
    for (const step of steps) {
      expect(step.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(step.acceptanceCriteria.some(c => c.mandatory)).toBe(true);
    }
  });
});
